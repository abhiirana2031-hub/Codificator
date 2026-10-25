import { parseCurriculumText, evaluateCurriculumCriteria } from '../server/services/pdfCourseScanner.js';

async function runTests() {
  console.log('=== TEST 1: REJECTED SYLLABUS ===');
  const badSyllabus = 'Course Title: Tiny\nJust some random text without structure';
  const badParsed = parseCurriculumText(badSyllabus);
  const badEval = evaluateCurriculumCriteria(badParsed);
  console.log('Status:', badEval.status, '| Score:', badEval.score + '%');
  console.log('Reasons:', badEval.reasons);
  console.log('Improvement Tips:', badEval.improvementTips);

  console.log('\n=== TEST 2: APPROVED SYLLABUS ===');
  const goodSyllabus = `Course Title: Deep Learning with PyTorch & Neural Networks
Category: Artificial Intelligence
Level: Intermediate to Advanced
Duration: 60 hours

Course Description:
A comprehensive curriculum for AI engineers and researchers mastering modern deep learning architectures, convolutional neural networks, sequence transformers, and distributed model training on GPU clusters.

Learning Objectives:
- Master tensor operations, automatic differentiation, and PyTorch computational graphs
- Implement and train Convolutional Neural Networks for vision tasks
- Build Transformer architectures and attention mechanisms from scratch
- Optimize and deploy neural models in production using ONNX and TorchScript

Prerequisites:
- Strong Python programming and basic multivariable calculus
- Familiarity with linear algebra and gradient descent

Module 1: Foundations of Deep Neural Networks
Module Overview: Computational graphs, backpropagation, and fundamental optimization.

Lesson 1: PyTorch Tensors and Autograd Engine
Format: TEXT
Duration: 20 mins
Content:
Understanding torch.Tensor, automatic differentiation graphs, gradient accumulation, and device allocation between CPU and CUDA devices.

Lesson 2: Multi-Layer Perceptrons & Custom Loss Functions
Format: CODE
Duration: 35 mins
Content:
Building custom nn.Module architectures, forward propagation, loss calculation with CrossEntropyLoss, and backprop optimization with AdamW.

Module 2: Computer Vision & Convolutional Networks
Module Overview: Visual feature hierarchies, convolutional kernels, pooling, and residual architectures.

Lesson 1: Convolutional Layers & Spatial Feature Extractors
Format: TEXT
Duration: 25 mins
Content:
Understanding kernel filters, stride, padding, receptive fields, and feature map dimensions across deep layers.

Lesson 2: Training ResNet from Scratch
Format: CODE
Duration: 40 mins
Content:
Implementing skip-connection residual blocks, batch normalization, and training a 18-layer residual network on CIFAR-10.`;

  const goodParsed = parseCurriculumText(goodSyllabus);
  const goodEval = evaluateCurriculumCriteria(goodParsed);
  console.log('Status:', goodEval.status, '| Score:', goodEval.score + '%');
  console.log('Modules parsed:', goodParsed.modules.length);
  console.log('Lessons parsed:', goodParsed.modules.reduce((a, m) => a + m.lessons.length, 0));
  console.log('Criteria:');
  Object.entries(goodEval.criteria).forEach(([k, v]) => {
    console.log(` - ${v.label}: ${v.passed ? 'PASSED' : 'FAILED'} (${v.found})`);
  });
}

runTests().catch(console.error);
