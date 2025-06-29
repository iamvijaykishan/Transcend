import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const translateClient = new TranslateClient({});
const s3Client = new S3Client({});

export const handler = async (event) => {
  if (!event.translate) return event;

  const transcriptJson = await downloadTranscriptFromS3(event.transcriptUrl);
  const items = transcriptJson.results.items;
  const original = items
    .filter(i => i.type === 'pronunciation')
    .map(i => i.alternatives[0].content)
    .join(" ");

  const result = await translateClient.send(new TranslateTextCommand({
    SourceLanguageCode: 'en',
    TargetLanguageCode: event.target_language,
    Text: original
  }));

  const translatedWords = result.TranslatedText.split(" ");
  let index = 0;
  const translatedItems = items.map(i => {
    if (i.type !== 'pronunciation') return i;
    return { ...i, alternatives: [{ content: translatedWords[index++] || '' }] };
  });

  return { ...event, items: translatedItems };
};

async function downloadTranscriptFromS3(s3Url) {
  const [, , , bucket, ...keyParts] = s3Url.split('/');
  const key = keyParts.join('/');
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  const body = await streamToString(response.Body);
  return JSON.parse(body);
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

