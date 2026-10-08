import OpenAI from "openai";

export const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
export const textModel = process.env.OPENAI_TEXT_MODEL || "gpt-5.1";
export const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
