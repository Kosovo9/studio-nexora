import Replicate from 'replicate';
import type { ImageType } from '@/types';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Hidden prompts for different image types
const PROMPTS = {
  person: `professional studio portrait photography, high-end fashion photography, 
    studio lighting setup with softbox and key light, clean white or gradient background, 
    sharp focus on subject, professional color grading, commercial photography quality, 
    8k resolution, photorealistic, professional headshot style`,
  
  'person-pet': `professional studio portrait photography with pet, high-end pet photography, 
    studio lighting setup, clean background, both subject and pet in sharp focus, 
    heartwarming composition, professional color grading, commercial photography quality, 
    8k resolution, photorealistic, professional pet portrait style`,
};

const NEGATIVE_PROMPT = `blurry, low quality, amateur, bad lighting, distorted, 
  deformed, ugly, bad anatomy, watermark, text, signature, cartoon, painting, 
  illustration, 3d render, low resolution, pixelated`;

export interface ProcessImageOptions {
  imageUrl: string;
  imageType: ImageType;
  numOutputs?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
}

export interface ProcessImageResult {
  outputs: string[];
  id: string;
  status: string;
}

/**
 * Process image with Replicate AI
 */
export async function processImageWithAI(
  options: ProcessImageOptions
): Promise<ProcessImageResult> {
  const {
    imageUrl,
    imageType,
    numOutputs = 1,
    guidanceScale = 7.5,
    numInferenceSteps = 50,
  } = options;

  try {
    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          image: imageUrl,
          prompt: PROMPTS[imageType],
          negative_prompt: NEGATIVE_PROMPT,
          num_outputs: numOutputs,
          guidance_scale: guidanceScale,
          num_inference_steps: numInferenceSteps,
          scheduler: 'K_EULER',
          refine: 'expert_ensemble_refiner',
          high_noise_frac: 0.8,
        },
      }
    );

    return {
      outputs: Array.isArray(output) ? output : [output as string],
      id: `img_${Date.now()}`,
      status: 'succeeded',
    };
  } catch (error) {
    console.error('Error processing image with Replicate:', error);
    throw new Error('Failed to process image with AI');
  }
}

/**
 * Remove background from image
 */
export async function removeBackground(imageUrl: string): Promise<string> {
  try {
    const output = await replicate.run(
      'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
      {
        input: {
          image: imageUrl,
        },
      }
    );

    return Array.isArray(output) ? output[0] : (output as string);
  } catch (error) {
    console.error('Error removing background:', error);
    throw new Error('Failed to remove background');
  }
}

/**
 * Enhance face in image
 */
export async function enhanceFace(imageUrl: string): Promise<string> {
  try {
    const output = await replicate.run(
      'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
      {
        input: {
          img: imageUrl,
          version: 'v1.4',
          scale: 2,
        },
      }
    );

    return Array.isArray(output) ? output[0] : (output as string);
  } catch (error) {
    console.error('Error enhancing face:', error);
    throw new Error('Failed to enhance face');
  }
}

/**
 * Upscale image
 */
export async function upscaleImage(imageUrl: string, scale: number = 2): Promise<string> {
  try {
    const output = await replicate.run(
      'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
      {
        input: {
          image: imageUrl,
          scale,
          face_enhance: true,
        },
      }
    );

    return Array.isArray(output) ? output[0] : (output as string);
  } catch (error) {
    console.error('Error upscaling image:', error);
    throw new Error('Failed to upscale image');
  }
}

/**
 * Complete image processing pipeline
 */
export async function processImagePipeline(
  imageUrl: string,
  imageType: ImageType
): Promise<string[]> {
  try {
    // Step 1: Remove background
    const noBgImage = await removeBackground(imageUrl);

    // Step 2: Enhance face
    const enhancedImage = await enhanceFace(noBgImage);

    // Step 3: Generate professional background
    const result = await processImageWithAI({
      imageUrl: enhancedImage,
      imageType,
      numOutputs: 3,
    });

    // Step 4: Upscale final images
    const upscaledImages = await Promise.all(
      result.outputs.map((url) => upscaleImage(url, 2))
    );

    return upscaledImages;
  } catch (error) {
    console.error('Error in image processing pipeline:', error);
    throw new Error('Failed to process image');
  }
}
