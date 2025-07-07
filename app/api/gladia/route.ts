// pages/api/gladia-stt.ts
import type { NextApiRequest, NextApiResponse } from "next";
import type { Fields, Files } from "formidable";

import fs from "fs";

import formidable from "formidable";
import FormData from "form-data";


export const config = {
  api: {
    bodyParser: false, // برای آپلود فایل باید غیرفعال شود
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const form = formidable({ multiples: false });

  form.parse(req, async (err: any, fields: Fields, files: Files) => {
    if (err) {
      console.error("Error parsing form", err);

      return res.status(500).json({ error: "Error parsing form" });
    }

    let file: formidable.File | undefined;

    if (Array.isArray(files.audio)) {
      file = files.audio[0];
    } else {
      file = files.audio;
    }

    if (!file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const audioStream = fs.createReadStream(file.filepath);
    const formData = new FormData();

    formData.append("audio", audioStream, {
      filename: file.originalFilename || undefined,
      contentType: "audio/wav",
    });
    formData.append("language", fields.language || "fa");
    formData.append("toggle_noise_reduction", "true"); // اختیاری: حذف نویز

    try {
      const response = await fetch(
        "https://api.gladia.io/audio/text/audio-transcription/",
        {
          method: "POST",
          headers: {
            "x-gladia-key": process.env.GLADIA_API_KEY as string,
            ...formData.getHeaders(),
          },
          body: formData,
        },
      );

      const result = await response.json();

      return res.status(200).json({
        transcription: result?.prediction?.transcription || "",
      });
    } catch (err) {
      console.error("Gladia API error", err);

      return res.status(500).json({ error: "Gladia API request failed" });
    }
  });
}
