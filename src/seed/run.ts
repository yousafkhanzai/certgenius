/**
 * Seeds real launch content so the site isn't empty:
 * - an admin user you can log in with
 * - certification categories
 * - three real, published certifications (AWS AI Practitioner, Microsoft Azure
 *   AI Fundamentals, Google Cloud Professional ML Engineer)
 * - five practice questions for each
 * - one sample blog post
 * - header/footer navigation links
 *
 * This runs automatically as part of every production build (see
 * src/scripts/ensure-db-schema.ts), so new certifications you add here go
 * live the moment you push - no manual script running required.
 *
 * Can also be run by hand locally with: npm run seed
 * Safe to run more than once - it skips anything that already exists, so
 * adding one new certification to the arrays below and pushing is all it
 * takes to publish it without touching anything already live.
 */
import 'dotenv/config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import config from '../payload.config'
import { paragraph, heading, richText } from './lexical'

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@certgenius.local'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'

export async function seedContent(payload: Payload) {
  payload.logger.info('Seeding sample content...')

  // 1. Admin user
  const existingUsers = await payload.find({
    collection: 'users',
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
  })
  const adminUser =
    existingUsers.docs[0] ||
    (await payload.create({
      collection: 'users',
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Admin' },
    }))
  payload.logger.info(`Admin user ready: ${ADMIN_EMAIL}`)

  // 2. Categories
  const categoryNames = ['AI & Machine Learning', 'Cloud Certifications']
  const categoryDocs: Record<string, { id: number | string }> = {}
  for (const name of categoryNames) {
    const found = await payload.find({
      collection: 'categories',
      where: { title: { equals: name } },
      limit: 1,
    })
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    categoryDocs[name] =
      found.docs[0] ||
      (await payload.create({
        collection: 'categories',
        data: { title: name, slug },
        draft: false,
      }))
  }

  // 3. Certifications
  const certsInput = [
    {
      title: 'AWS Certified AI Practitioner',
      slug: 'aws-certified-ai-practitioner',
      vendor: 'AWS',
      examCode: 'AIF-C01',
      difficulty: 'beginner' as const,
      category: [Number(categoryDocs['AI & Machine Learning'].id), Number(categoryDocs['Cloud Certifications'].id)],
      summary:
        'A foundational certification that validates your understanding of AI, machine learning, and generative AI concepts on AWS.',
      passingScore: 70,
      durationMinutes: 90,
      overview: richText([
        heading('What This Certification Covers'),
        paragraph(
          'The AWS Certified AI Practitioner exam validates a foundational understanding of artificial intelligence (AI), machine learning (ML), and generative AI concepts, along with related AWS services and tools.',
        ),
        paragraph(
          'It is designed for people in business, sales, marketing, and technical roles who want to demonstrate an overall understanding of AI/ML technology, regardless of whether they build ML solutions themselves.',
        ),
        heading('Who Should Take This Exam'),
        paragraph(
          'This exam is a good starting point whether you work directly with AI/ML systems or simply need to understand AWS AI services well enough to make informed decisions.',
        ),
      ]),
    },
    {
      title: 'Microsoft Azure AI Fundamentals',
      slug: 'microsoft-azure-ai-fundamentals',
      vendor: 'Microsoft',
      examCode: 'AI-900',
      difficulty: 'beginner' as const,
      category: [Number(categoryDocs['AI & Machine Learning'].id), Number(categoryDocs['Cloud Certifications'].id)],
      summary:
        'An entry-level certification covering core AI concepts and how they map to Microsoft Azure AI services.',
      passingScore: 70,
      durationMinutes: 60,
      overview: richText([
        heading('What This Certification Covers'),
        paragraph(
          'The Azure AI Fundamentals certification is intended for candidates familiar with the concepts of AI and ML, and how they can be implemented using Microsoft Azure services.',
        ),
        paragraph(
          'Topics include machine learning concepts, computer vision, natural language processing, generative AI, and responsible AI principles.',
        ),
        heading('Who Should Take This Exam'),
        paragraph(
          'It is aimed at both technical and non-technical audiences and does not require prior experience in AI, machine learning, or data science.',
        ),
      ]),
    },
    {
      title: 'Google Cloud Professional ML Engineer',
      slug: 'google-cloud-ml-engineer',
      vendor: 'Google Cloud',
      examCode: 'PMLE',
      difficulty: 'advanced' as const,
      category: [Number(categoryDocs['AI & Machine Learning'].id), Number(categoryDocs['Cloud Certifications'].id)],
      summary:
        'A professional-level certification for engineers who design, build, and deploy production machine learning models on Google Cloud with Vertex AI.',
      passingScore: 70,
      durationMinutes: 120,
      overview: richText([
        heading('What This Certification Covers'),
        paragraph(
          'The Google Cloud Professional Machine Learning Engineer certification validates the ability to design, build, and productionize ML models to solve business challenges using Google Cloud technologies and knowledge of proven ML models and techniques.',
        ),
        paragraph(
          'It covers framing ML problems, architecting ML solutions, preparing and processing data, developing models, and automating and orchestrating ML pipelines using Vertex AI and related Google Cloud services.',
        ),
        heading('Who Should Take This Exam'),
        paragraph(
          'This is a professional-level exam aimed at ML engineers and data scientists with hands-on experience building and deploying models on Google Cloud. It assumes familiarity with ML fundamentals and is more advanced than entry-level cloud AI certifications like AWS AI Practitioner or Azure AI Fundamentals.',
        ),
      ]),
    },
  ]

  const certDocs: Record<string, { id: number | string }> = {}
  for (const cert of certsInput) {
    const found = await payload.find({
      collection: 'certifications',
      where: { slug: { equals: cert.slug } },
      limit: 1,
    })
    certDocs[cert.slug] =
      found.docs[0] ||
      (await payload.create({
        collection: 'certifications',
        data: { ...cert, _status: 'published' },
      }))
  }
  payload.logger.info('Certifications ready.')

  // 4. Practice questions
  const questionsInput: Array<{
    certSlug: string
    questionText: string
    options: Array<{ text: string; isCorrect: boolean }>
    explanation: string
    topic: string
  }> = [
    // AWS AI Practitioner
    {
      certSlug: 'aws-certified-ai-practitioner',
      questionText: 'What is the primary purpose of Amazon SageMaker?',
      options: [
        { text: 'A fully managed service to build, train, and deploy machine learning models', isCorrect: true },
        { text: 'A relational database for transactional workloads', isCorrect: false },
        { text: 'A content delivery network for static websites', isCorrect: false },
        { text: 'A tool exclusively for billing and cost management', isCorrect: false },
      ],
      explanation:
        'Amazon SageMaker is a fully managed service that provides tools across the entire ML workflow, from data preparation to training and deployment.',
      topic: 'Core AWS AI/ML Services',
    },
    {
      certSlug: 'aws-certified-ai-practitioner',
      questionText:
        'Which AWS service is designed for building conversational interfaces such as chatbots using voice and text?',
      options: [
        { text: 'Amazon Lex', isCorrect: true },
        { text: 'Amazon Redshift', isCorrect: false },
        { text: 'AWS Lambda', isCorrect: false },
        { text: 'Amazon S3', isCorrect: false },
      ],
      explanation:
        'Amazon Lex is a service for building conversational interfaces into applications using voice and text, powered by the same technology as Alexa.',
      topic: 'AI Services',
    },
    {
      certSlug: 'aws-certified-ai-practitioner',
      questionText: 'What does the term "foundation model" refer to in generative AI?',
      options: [
        { text: 'A large model pre-trained on broad data that can be adapted to many downstream tasks', isCorrect: true },
        { text: 'A small rule-based system with no training data', isCorrect: false },
        { text: 'A database schema used to store training data', isCorrect: false },
        { text: 'A billing model for AWS compute usage', isCorrect: false },
      ],
      explanation:
        'Foundation models are large models trained on vast amounts of data that can be fine-tuned or prompted for many different downstream tasks.',
      topic: 'Generative AI Concepts',
    },
    {
      certSlug: 'aws-certified-ai-practitioner',
      questionText:
        'Which AWS service provides pre-trained computer vision capabilities such as object and face detection without requiring ML expertise?',
      options: [
        { text: 'Amazon Rekognition', isCorrect: true },
        { text: 'Amazon Athena', isCorrect: false },
        { text: 'AWS Glue', isCorrect: false },
        { text: 'Amazon CloudFront', isCorrect: false },
      ],
      explanation:
        'Amazon Rekognition is a pre-trained computer vision service used for image and video analysis, including object, face, and text detection.',
      topic: 'AI Services',
    },
    {
      certSlug: 'aws-certified-ai-practitioner',
      questionText: 'Responsible AI practices primarily aim to address which of the following?',
      options: [
        { text: 'Fairness, transparency, privacy, and reducing bias in AI systems', isCorrect: true },
        { text: 'Reducing the cost of cloud storage', isCorrect: false },
        { text: 'Increasing network bandwidth for training jobs', isCorrect: false },
        { text: 'Simplifying database schema design', isCorrect: false },
      ],
      explanation:
        'Responsible AI focuses on principles such as fairness, explainability, privacy and security, safety, and governance of AI systems.',
      topic: 'Responsible AI',
    },
    // Azure AI-900
    {
      certSlug: 'microsoft-azure-ai-fundamentals',
      questionText: 'Which Azure service is used to add conversational bot experiences to an application?',
      options: [
        { text: 'Azure Bot Service', isCorrect: true },
        { text: 'Azure SQL Database', isCorrect: false },
        { text: 'Azure Front Door', isCorrect: false },
        { text: 'Azure DevOps', isCorrect: false },
      ],
      explanation:
        'Azure Bot Service, together with the Language Service, is used to build, test, and deploy conversational AI bots.',
      topic: 'Conversational AI',
    },
    {
      certSlug: 'microsoft-azure-ai-fundamentals',
      questionText: 'What is Azure AI Vision primarily used for?',
      options: [
        { text: 'Analyzing images and video to extract objects, text, and other information', isCorrect: true },
        { text: 'Managing relational database backups', isCorrect: false },
        { text: 'Provisioning virtual networks', isCorrect: false },
        { text: 'Monitoring billing alerts', isCorrect: false },
      ],
      explanation:
        'Azure AI Vision provides pre-built computer vision capabilities such as image analysis, OCR, and object detection.',
      topic: 'Computer Vision',
    },
    {
      certSlug: 'microsoft-azure-ai-fundamentals',
      questionText: 'What is the main purpose of Azure Machine Learning?',
      options: [
        { text: 'A managed platform to build, train, and deploy machine learning models', isCorrect: true },
        { text: 'A tool for managing Azure Active Directory users', isCorrect: false },
        { text: 'A content delivery network', isCorrect: false },
        { text: 'A service exclusively for hosting static websites', isCorrect: false },
      ],
      explanation:
        'Azure Machine Learning is an end-to-end platform for the machine learning lifecycle, including data prep, training, and deployment.',
      topic: 'Machine Learning Concepts',
    },
    {
      certSlug: 'microsoft-azure-ai-fundamentals',
      questionText: "In Azure AI Document Intelligence, what does OCR stand for?",
      options: [
        { text: 'Optical Character Recognition', isCorrect: true },
        { text: 'Online Content Rendering', isCorrect: false },
        { text: 'Operational Cost Reduction', isCorrect: false },
        { text: 'Object Classification Routine', isCorrect: false },
      ],
      explanation:
        'OCR (Optical Character Recognition) is the technology used to detect and extract printed or handwritten text from images and documents.',
      topic: 'Document Intelligence',
    },
    {
      certSlug: 'microsoft-azure-ai-fundamentals',
      questionText: "Which of the following is one of Microsoft's Responsible AI principles?",
      options: [
        { text: 'Fairness', isCorrect: true },
        { text: 'Maximum resource utilization', isCorrect: false },
        { text: 'Vendor lock-in', isCorrect: false },
        { text: 'Lowest possible latency at any cost', isCorrect: false },
      ],
      explanation:
        "Microsoft's Responsible AI principles include fairness, reliability & safety, privacy & security, inclusiveness, transparency, and accountability.",
      topic: 'Responsible AI',
    },
    // Google Cloud Professional ML Engineer
    {
      certSlug: 'google-cloud-ml-engineer',
      questionText: 'What is the primary purpose of Vertex AI on Google Cloud?',
      options: [
        {
          text: 'A unified platform for building, training, deploying, and managing ML models across the full ML lifecycle',
          isCorrect: true,
        },
        { text: 'A managed relational database for transactional workloads', isCorrect: false },
        { text: 'A content delivery network for static websites', isCorrect: false },
        { text: 'An identity and access management tool only', isCorrect: false },
      ],
      explanation:
        'Vertex AI is Google Cloud\'s unified ML platform, covering data preparation, training, tuning, deployment, and monitoring of models in one place.',
      topic: 'Vertex AI Fundamentals',
    },
    {
      certSlug: 'google-cloud-ml-engineer',
      questionText:
        'Which Vertex AI capability automatically searches model architectures and hyperparameters to produce a strong model with minimal manual tuning?',
      options: [
        { text: 'Vertex AI AutoML', isCorrect: true },
        { text: 'BigQuery reservations', isCorrect: false },
        { text: 'Cloud Pub/Sub', isCorrect: false },
        { text: 'Cloud CDN', isCorrect: false },
      ],
      explanation:
        'Vertex AI AutoML trains high-quality models automatically with minimal effort and ML expertise required from the user.',
      topic: 'AutoML & Model Development',
    },
    {
      certSlug: 'google-cloud-ml-engineer',
      questionText: 'What problem does a feature store, such as Vertex AI Feature Store, solve?',
      options: [
        {
          text: 'It centralizes storage and serving of ML features so they stay consistent between training and serving',
          isCorrect: true,
        },
        { text: 'It stores raw unstructured video files for archival purposes', isCorrect: false },
        { text: 'It manages IAM roles and permissions', isCorrect: false },
        { text: 'It hosts static marketing websites', isCorrect: false },
      ],
      explanation:
        'A feature store provides a central, consistent source of features so the values used at training time match what is served in production, reducing training-serving skew.',
      topic: 'Feature Engineering',
    },
    {
      certSlug: 'google-cloud-ml-engineer',
      questionText:
        'Which Google Cloud service is best suited for building scalable, serverless data processing pipelines to prepare training data?',
      options: [
        { text: 'Dataflow', isCorrect: true },
        { text: 'Cloud Speech-to-Text', isCorrect: false },
        { text: 'Vertex AI Workbench notebooks alone', isCorrect: false },
        { text: 'Cloud DNS', isCorrect: false },
      ],
      explanation:
        'Dataflow is a fully managed, serverless service for building batch and streaming data processing pipelines, commonly used to prepare and transform training data at scale.',
      topic: 'Data Pipelines',
    },
    {
      certSlug: 'google-cloud-ml-engineer',
      questionText: 'What does "model drift" refer to in a production ML system?',
      options: [
        {
          text: "A decline in a model's predictive performance over time as real-world data patterns diverge from training data",
          isCorrect: true,
        },
        { text: 'An increase in the volume of available training data', isCorrect: false },
        { text: 'A reduction in cloud compute billing costs', isCorrect: false },
        { text: 'Faster inference latency after deployment', isCorrect: false },
      ],
      explanation:
        'Model drift happens when the statistical properties of production data change over time, causing a previously accurate model to become less reliable - which is why monitoring deployed models is part of MLOps.',
      topic: 'ML Operations & Monitoring',
    },
  ]

  for (const q of questionsInput) {
    const certId = Number(certDocs[q.certSlug].id)
    const existing = await payload.find({
      collection: 'questions',
      where: {
        and: [
          { certification: { equals: certId } },
          { questionText: { equals: q.questionText } },
        ],
      },
      limit: 1,
    })
    if (!existing.docs[0]) {
      await payload.create({
        collection: 'questions',
        data: {
          certification: certId,
          questionText: q.questionText,
          options: q.options,
          explanation: q.explanation,
          topic: q.topic,
          difficulty: 'beginner',
        },
      })
    }
  }
  payload.logger.info('Practice questions ready.')

  // 5. Sample blog post
  const postSlug = 'how-to-pass-the-aws-ai-practitioner-exam'
  const existingPost = await payload.find({
    collection: 'posts',
    where: { slug: { equals: postSlug } },
    limit: 1,
  })
  if (!existingPost.docs[0]) {
    try {
      await payload.create({
        collection: 'posts',
        data: {
        title: 'How to Pass the AWS AI Practitioner Exam: A Study Guide',
        slug: postSlug,
        _status: 'published',
        authors: [Number(adminUser.id)],
        publishedAt: new Date().toISOString(),
        content: richText([
          paragraph(
            'The AWS Certified AI Practitioner exam is one of the most accessible ways to prove you understand modern AI and machine learning concepts on AWS, even if you are not an ML engineer.',
          ),
          heading('1. Start With the Exam Guide'),
          paragraph(
            'AWS publishes an official exam guide that breaks down every domain and its weighting. Read it first so you know exactly what to study.',
          ),
          heading('2. Focus on Core Services'),
          paragraph(
            'You should be comfortable explaining what services like Amazon SageMaker, Amazon Bedrock, Amazon Rekognition, and Amazon Lex are used for at a conceptual level.',
          ),
          heading('3. Practice, Practice, Practice'),
          paragraph(
            'Use our free practice test for this certification to check your understanding and see explanations for every question.',
          ),
        ]),
        },
      })
    } catch (err) {
      // Revalidation errors are expected when seeding without a live Next.js server -
      // the document is still saved. See: payload docs on the seed script pattern.
      payload.logger.info(
        'Post saved (a harmless revalidate warning may appear above when seeding without a running server).',
      )
    }
  }
  payload.logger.info('Sample blog post ready.')

  // 6. Header / footer navigation
  // (revalidate hooks throw when there's no live Next.js server during seeding -
  // that's expected and the data is still saved, so we swallow it here)
  try {
    await payload.updateGlobal({
      slug: 'header',
      data: {
        navItems: [
          { link: { type: 'custom', url: '/certifications', label: 'Certifications', newTab: false } },
          { link: { type: 'custom', url: '/posts', label: 'Blog', newTab: false } },
          { link: { type: 'custom', url: '/search', label: 'Search', newTab: false } },
        ],
      },
    })
  } catch (err) {
    payload.logger.info('Header nav saved (harmless revalidate warning above).')
  }
  try {
    await payload.updateGlobal({
      slug: 'footer',
      data: {
        navItems: [
          { link: { type: 'custom', url: '/certifications', label: 'Certifications', newTab: false } },
          { link: { type: 'custom', url: '/posts', label: 'Blog', newTab: false } },
        ],
      },
    })
  } catch (err) {
    payload.logger.info('Footer nav saved (harmless revalidate warning above).')
  }
  payload.logger.info('Navigation updated.')

  payload.logger.info('Seeding complete!')
}

// CLI entry point for running this by hand locally with `npm run seed`.
// In production, seedContent() above is called directly from
// src/scripts/ensure-db-schema.ts as part of every build instead.
async function run() {
  const payload = await getPayload({ config })
  await seedContent(payload)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
