/**
 * Codificators Bounded Execution Queue & Concurrency Manager
 * Enforces global concurrency limits, maximum queue capacity, FIFO prioritization,
 * queue wait timeouts, and structured operational metrics to protect the host
 * LMS from resource exhaustion.
 */

export class QueueCapacityExceededError extends Error {
  constructor(message = 'Execution capacity exceeded. The execution queue is currently full.') {
    super(message);
    this.name = 'QueueCapacityExceededError';
    this.statusCode = 503;
  }
}

export class QueueTimeoutError extends Error {
  constructor(message = 'Execution request timed out waiting in the job queue.') {
    super(message);
    this.name = 'QueueTimeoutError';
    this.statusCode = 504;
  }
}

export class ExecutionQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || parseInt(process.env.EXECUTION_MAX_CONCURRENCY, 10) || 4;
    this.maxQueueCapacity = options.maxQueueCapacity || parseInt(process.env.EXECUTION_MAX_QUEUE, 10) || 50;
    this.queueWaitTimeoutMs = options.queueWaitTimeoutMs || 5000;

    this.activeWorkers = 0;
    this.queue = [];

    // Operational metrics
    this.metrics = {
      totalSubmitted: 0,
      totalExecuted: 0,
      totalSuccess: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      totalQueueRejections: 0,
      totalQueueTimeouts: 0
    };
  }

  /**
   * Enqueues an execution task and returns a promise that resolves when execution finishes.
   * @param {Function} taskFn Async function performing the isolated execution
   * @param {Object} metadata Information about the execution for observability
   */
  async enqueue(taskFn, metadata = {}) {
    this.metrics.totalSubmitted++;

    if (this.queue.length >= this.maxQueueCapacity) {
      this.metrics.totalQueueRejections++;
      this.logEvent('QUEUE_REJECTED', {
        reason: 'Capacity exceeded',
        queueLength: this.queue.length,
        maxCapacity: this.maxQueueCapacity,
        metadata
      });
      throw new QueueCapacityExceededError(`Execution queue is full (${this.maxQueueCapacity} queued requests). Please retry in a few seconds.`);
    }

    return new Promise((resolve, reject) => {
      const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const queueEntryTime = Date.now();

      let timeoutTimer = null;

      const jobItem = {
        jobId,
        taskFn,
        metadata,
        resolve: (val) => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          resolve(val);
        },
        reject: (err) => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          reject(err);
        },
        queueEntryTime
      };

      // Set timeout for waiting in queue
      timeoutTimer = setTimeout(() => {
        const idx = this.queue.indexOf(jobItem);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          this.metrics.totalQueueTimeouts++;
          this.logEvent('QUEUE_TIMEOUT', {
            jobId,
            waitedMs: Date.now() - queueEntryTime,
            metadata
          });
          reject(new QueueTimeoutError(`Execution request waited longer than ${this.queueWaitTimeoutMs}ms in the queue without an available worker.`));
        }
      }, this.queueWaitTimeoutMs);

      this.queue.push(jobItem);
      this.logEvent('JOB_ENQUEUED', {
        jobId,
        queuePosition: this.queue.length,
        activeWorkers: this.activeWorkers,
        metadata
      });

      this.processNext();
    });
  }

  processNext() {
    if (this.activeWorkers >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeWorkers++;
    const waitTimeMs = Date.now() - job.queueEntryTime;
    const executionStartTime = Date.now();

    this.logEvent('JOB_STARTED', {
      jobId: job.jobId,
      waitTimeMs,
      activeWorkers: this.activeWorkers,
      queueRemaining: this.queue.length,
      metadata: job.metadata
    });

    // Run the execution worker task
    Promise.resolve()
      .then(() => job.taskFn(job.jobId))
      .then((result) => {
        this.metrics.totalExecuted++;
        if (result && (result.status === 'SUCCESS' || result.status === 'ACCEPTED')) {
          this.metrics.totalSuccess++;
        } else if (result && result.status === 'TIME_LIMIT_EXCEEDED') {
          this.metrics.totalTimeouts++;
        } else {
          this.metrics.totalFailures++;
        }

        const executionDurationMs = Date.now() - executionStartTime;
        this.logEvent('JOB_COMPLETED', {
          jobId: job.jobId,
          status: result?.status,
          executionDurationMs,
          metadata: job.metadata
        });

        job.resolve(result);
      })
      .catch((err) => {
        this.metrics.totalExecuted++;
        this.metrics.totalFailures++;
        const executionDurationMs = Date.now() - executionStartTime;
        this.logEvent('JOB_FAILED', {
          jobId: job.jobId,
          error: err.message,
          executionDurationMs,
          metadata: job.metadata
        });
        job.reject(err);
      })
      .finally(() => {
        this.activeWorkers--;
        // Process next available item in queue
        setImmediate(() => this.processNext());
      });
  }

  /**
   * Returns current operational metrics and queue saturation status.
   */
  getMetrics() {
    const workerSaturation = this.maxConcurrent > 0 ? (this.activeWorkers / this.maxConcurrent) : 0;
    return {
      activeWorkers: this.activeWorkers,
      maxConcurrent: this.maxConcurrent,
      queueDepth: this.queue.length,
      maxQueueCapacity: this.maxQueueCapacity,
      workerSaturationPercent: Math.round(workerSaturation * 100),
      isSaturated: this.activeWorkers >= this.maxConcurrent,
      ...this.metrics
    };
  }

  /**
   * Structured operational logger that sanitizes secrets and sensitive test data.
   */
  logEvent(eventType, details) {
    if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_EXECUTION) {
      return; // Quiet in automated test runs unless explicitly debugged
    }

    const payload = {
      timestamp: new Date().toISOString(),
      event: eventType,
      ...details
    };

    // Strip sensitive test information or personal data if inadvertently passed
    if (payload.metadata) {
      const { userId, exerciseId, language } = payload.metadata;
      payload.metadata = { userId, exerciseId, language };
    }

    console.log(`[EXECUTION_QUEUE] ${JSON.stringify(payload)}`);
  }
}

// Global singleton instance for the platform
export const globalExecutionQueue = new ExecutionQueue();
