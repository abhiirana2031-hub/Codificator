import { verifiedLicenses } from '../licenseRegistry';

export const mlModule = {
  id: "machine-learning",
  courseId: "machine-learning",
  title: "Machine Learning Foundations & Applied Modeling",
  category: "Computer Science Core",
  level: "Beginner to Advanced",
  rating: 4.95,
  reviewsCount: 14700,
  studentsCount: "390k+",
  instructor: "Microsoft Cloud Advocates & Azure AI Curriculum Team",
  bannerGradient: "linear-gradient(135deg, #065f46 0%, #059669 100%)",
  badge: "MIT Flagship",
  description: "Text-first machine learning fundamentals adapted from Microsoft ML for Beginners: Supervised vs Unsupervised paradigms, Cost Functions, Gradient Descent optimization, Bias-Variance tradeoff, and evaluation metrics.",
  highlights: [
    "Mathematical derivation of Ordinary Least Squares (OLS) and Mean Squared Error (MSE) cost functions",
    "Gradient descent update equations, learning rate dynamics, and convergence diagnostics",
    "Regularization techniques (L1 Lasso, L2 Ridge) to control overfitting and stabilize high-dimensional models",
    "Automated unit testing with in-browser matrix and vector computation assertions"
  ],
  modules: [
    {
      id: "ml-m1",
      title: "Module 1: Supervised Learning & Optimization Dynamics",
      chapters: [
        {
          id: "ml-m1-c1",
          title: "Chapter 1: Regression, Cost Functions & Gradient Descent",
          lessons: [
            {
              id: "ml-m1-c1-l1",
              title: "Linear Regression, Loss Minimization & Gradient Descent Optimization",
              estimatedReadTime: "17 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",

              // 1. Learning Objectives
              objectives: [
                "Formulate the linear hypothesis function $h_\\theta(x) = \\theta_0 + \\theta_1 x$ and vectorize multi-feature inputs.",
                "Derive the Mean Squared Error (MSE) cost function $J(\\theta)$ and explain why its convexity guarantees a global minimum.",
                "Calculate partial derivatives to execute Batch Gradient Descent updates with learning rate $\\alpha$ tuning.",
                "Differentiate high bias (underfitting) from high variance (overfitting) using train/validation error curves."
              ],

              // 2. Prerequisites
              prerequisites: [
                { title: "Calculus: Partial derivatives and chain rule basics" },
                { title: "Linear Algebra: Vector dot products and matrix dimensions" }
              ],

              // 3. Detailed Original Explanations
              explanation: `### The Supervised Learning Framework

In **Supervised Learning**, we are given a training dataset of $m$ labeled examples:
$$\\mathcal{D} = \\{(x^{(1)}, y^{(1)}), (x^{(2)}, y^{(2)}), \\dots, (x^{(m)}, y^{(m)})\\}$$
where $x^{(i)} \\in \\mathbb{R}^n$ represents the input feature vector and $y^{(i)}$ represents the target output label.

Our goal is to learn a hypothesis function $h_\\theta(x)$ that accurately predicts target outputs on unseen data.

#### The Linear Hypothesis
For univariate linear regression:
$$h_\\theta(x) = \\theta_0 + \\theta_1 x_1$$
In vectorized notation for $n$ features:
$$h_\\theta(x) = \\sum_{j=0}^{n} \\theta_j x_j = \\theta^T x \\quad \\text{where } x_0 = 1$$

---

### The Cost Function: Mean Squared Error (MSE)

To measure how well parameters $\\theta$ fit the training data, we define the **Cost Function** $J(\\theta)$:
$$J(\\theta_0, \\theta_1) = \\frac{1}{2m} \\sum_{i=1}^{m} \\left( h_\\theta(x^{(i)}) - y^{(i)} \\right)^2$$
- The factor $\\frac{1}{2}$ is introduced to cancel out the exponent $2$ when taking the derivative during optimization.
- For linear regression, $J(\\theta)$ is a **convex bowl-shaped function**. It possesses a single global minimum and zero local minima traps!

---

### Optimization via Gradient Descent

To minimize $J(\\theta)$, we start with initial guesses (e.g., $\\theta_0 = 0, \\theta_1 = 0$) and iteratively adjust $\\theta$ in the direction of steepest descent (negative gradient):
$$\\theta_j := \\theta_j - \\alpha \\frac{\\partial}{\\partial \\theta_j} J(\\theta) \\quad (\\text{simultaneously for all } j)$$
where $\\alpha > 0$ is the **Learning Rate**.

#### Computing the Partial Derivative
$$\\frac{\\partial}{\\partial \\theta_j} J(\\theta) = \\frac{1}{m} \\sum_{i=1}^{m} \\left( h_\\theta(x^{(i)}) - y^{(i)} \\right) x_j^{(i)}$$

Substituting back into the update rule:
$$\\theta_0 := \\theta_0 - \\alpha \\frac{1}{m} \\sum_{i=1}^{m} \\left( h_\\theta(x^{(i)}) - y^{(i)} \\right)$$
$$\\theta_1 := \\theta_1 - \\alpha \\frac{1}{m} \\sum_{i=1}^{m} \\left( h_\\theta(x^{(i)}) - y^{(i)} \\right) x^{(i)}$$

#### Learning Rate ($\\alpha$) Dynamics:
- **If $\\alpha$ is too small**: Gradient descent makes microscopic steps, requiring millions of iterations to converge.
- **If $\\alpha$ is too large**: The update overshoots the minimum, fails to converge, or diverges upward towards infinity!

---

### The Bias-Variance Tradeoff & Regularization

\`\`\`
   High Bias (Underfitting)          Balanced Generalization         High Variance (Overfitting)
        *   *    *                         *   *    *                       *   *    *
     ---/-------/---                    ---/----\\----/---               --/-\\--/\\--/-\\--
       *   *    *                         *   *    *                      *   *    *
 (Model too simple: High train err)    (Good test set fit)     (Memorized noise: High test err)
\`\`\`

- **L2 Regularization (Ridge)**: Adds penalty $\\lambda \\sum \\theta_j^2$ to $J(\\theta)$, shrinking weight magnitudes.
- **L1 Regularization (Lasso)**: Adds penalty $\\lambda \\sum |\\theta_j|$, driving less important feature weights to exactly zero (feature selection).`,

              // 4. Definitions and Key Concepts
              keyConcepts: [
                {
                  term: "Gradient Descent",
                  definition: "A first-order iterative optimization algorithm for finding a local minimum of a differentiable cost function by taking steps proportional to the negative gradient."
                },
                {
                  term: "Convex Function",
                  definition: "A function where any line segment connecting two points on the graph lies on or above the graph, guaranteeing that any local minimum is a global minimum."
                },
                {
                  term: "Bias-Variance Tradeoff",
                  definition: "The conflict in supervised learning where high bias causes underfitting (ignoring real trends) and high variance causes overfitting (modeling training noise)."
                },
                {
                  term: "Learning Rate (alpha)",
                  definition: "A tuning hyperparameter in gradient descent that determines the step size taken in the direction of the negative gradient at each iteration."
                }
              ],

              // 5. Step-by-Step Worked Examples
              workedExamples: [
                {
                  title: "One Iteration of Gradient Descent Calculation",
                  scenario: "Given dataset {(1, 2), (2, 4)}, starting parameters theta0 = 0, theta1 = 0, and learning rate alpha = 0.1, compute updated parameters.",
                  steps: [
                    {
                      stepNumber: 1,
                      action: "Calculate Predictions",
                      stateSnapshot: "m = 2. For x=1: h(1) = 0 + 0(1) = 0. For x=2: h(2) = 0. Predictions: [0, 0]."
                    },
                    {
                      stepNumber: 2,
                      action: "Calculate Prediction Errors",
                      stateSnapshot: "Errors (h - y): [0 - 2 = -2, 0 - 4 = -4]."
                    },
                    {
                      stepNumber: 3,
                      action: "Compute Gradients",
                      stateSnapshot: "grad_theta0 = (1/2)*(-2 + -4) = -3. grad_theta1 = (1/2)*((-2)*1 + (-4)*2) = (1/2)*(-2 - 8) = -5."
                    },
                    {
                      stepNumber: 4,
                      action: "Apply Parameter Updates",
                      stateSnapshot: "theta0 = 0 - 0.1*(-3) = 0.3. theta1 = 0 - 0.1*(-5) = 0.5."
                    }
                  ],
                  result: "Updated parameters after step 1: theta0 = 0.3, theta1 = 0.5. Hypothesis updated from y=0 to y=0.3 + 0.5x."
                }
              ],

              // 6. Production Code Snippets
              codeSnippets: [
                {
                  language: "javascript",
                  title: "Batch Gradient Descent for Linear Regression in JavaScript",
                  code: `// Computes updated theta parameters over epochs
function trainLinearRegression(X, y, alpha = 0.01, epochs = 1000) {
  const m = X.length;
  let theta0 = 0;
  let theta1 = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    let sumErr0 = 0;
    let sumErr1 = 0;

    for (let i = 0; i < m; i++) {
      const prediction = theta0 + theta1 * X[i];
      const error = prediction - y[i];
      sumErr0 += error;
      sumErr1 += error * X[i];
    }

    // Simultaneous update
    theta0 -= (alpha / m) * sumErr0;
    theta1 -= (alpha / m) * sumErr1;
  }

  return { theta0, theta1 };
}`,
                  annotation: "Batch gradient descent processes all m training examples on every iteration, guaranteeing smooth convergence on convex MSE surfaces."
                }
              ],

              // 7. Common Mistakes and Corrections
              pitfalls: [
                {
                  mistake: "Updating theta0 and immediately using the new theta0 when calculating gradient for theta1.",
                  whyItHappens: "Beginners write theta0 = theta0 - grad; theta1 = theta1 - grad(using new theta0), violating simultaneous update.",
                  correction: "Store gradients in temporary variables or compute full vectors before applying parameter updates."
                },
                {
                  mistake: "Training linear regression on features with wildly different numerical scales (e.g., house size in sqft [500-5000] vs bedrooms [1-5]) without feature normalization.",
                  whyItHappens: "Creates an elongated, elliptical cost surface where gradient descent oscillates endlessly.",
                  correction: "Always apply Feature Scaling / Z-score normalization: x_norm = (x - mean) / std."
                }
              ],

              // 8. Diagrams and Structured Reference Tables
              visualAids: [
                {
                  type: "comparison-table",
                  title: "Gradient Descent Variants Comparison",
                  content: `| Variant | Dataset Size per Update | Speed per Epoch | Convergence Behavior | Memory Requirement |
|---|---|---|---|---|
| **Batch GD** | All $m$ examples | Slow on large data | Smooth, guaranteed to minimum | High ($O(m)$ RAM) |
| **Stochastic GD (SGD)** | $1$ random example | Fast | Noisy, oscillates near minimum | Low ($O(1)$ RAM) |
| **Mini-Batch GD** | Batch of $32 - 512$ | Optimal for GPU vectorization | Stable, fast convergence | Moderate ($O(B)$ RAM) |`
                }
              ],

              // 9. Practice Exercises (With Automated Unit Test Runner)
              exercises: [
                {
                  difficulty: "Easy",
                  prompt: "Implement a function 'predictLinear(x, theta0, theta1)' that computes the predicted value h(x) = theta0 + theta1 * x for any given input, rounded to 2 decimal places.",
                  hint: "Compute theta0 + theta1 * x, then use Number((val).toFixed(2)).",
                  starterCode: `function predictLinear(x, theta0, theta1) {
  const result = theta0 + theta1 * x;
  return Number(result.toFixed(2));
}`,
                  testCases: [
                    {
                      input: { x: 5, theta0: 1.5, theta1: 2.0 },
                      expected: 11.5
                    },
                    {
                      input: { x: 10, theta0: -2.0, theta1: 0.5 },
                      expected: 3.0
                    }
                  ]
                }
              ],

              // 10. Concept Checkpoint Quiz
              quiz: [
                {
                  question: "Why is the Mean Squared Error (MSE) cost function for linear regression guaranteed to have no local minima traps?",
                  options: [
                    "Because it is an exponential function.",
                    "Because it is mathematically convex (bowl-shaped), meaning any local minimum is the global minimum.",
                    "Because the learning rate alpha is always positive.",
                    "Because linear models only work with positive datasets."
                  ],
                  correctIndex: 1,
                  explanation: "The MSE cost function J(theta) for linear regression is a quadratic convex function. Convex optimization theory proves that convex functions possess only a single global minimum."
                }
              ],

              // 11. Chapter Summary & Revision Notes
              summary: {
                takeaways: [
                  "Supervised linear regression models continuous targets using a weighted linear combination of features.",
                  "Mean Squared Error (MSE) provides a smooth, convex optimization surface for gradient descent.",
                  "Feature scaling ensures symmetric cost contours, preventing gradient descent oscillation."
                ],
                quickCheatSheet: "MSE: J(theta) = 1/(2m) * sum((h(x) - y)^2). Update: theta_j := theta_j - alpha * (1/m) * sum((h(x) - y) * x_j). L2 Ridge: shrinks weights; L1 Lasso: zeros weights."
              },

              // 12. Further Reading & Licensing Provenance
              metadata: {
                furtherReading: [
                  {
                    title: "Microsoft ML for Beginners (26 Lessons)",
                    url: "https://github.com/microsoft/ML-For-Beginners",
                    annotation: "Open-source comprehensive curriculum with hands-on labs, math foundations, and visualization."
                  },
                  {
                    title: "Scikit-Learn Linear Models Documentation",
                    url: "https://scikit-learn.org/stable/modules/linear_model.html",
                    annotation: "Standard reference for production regression and regularization implementations."
                  }
                ],
                licenseRecord: verifiedLicenses["lic-microsoft-ml"]
              }
            }
          ]
        }
      ]
    }
  ]
};
