import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import https from 'https';
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";

const s3Client = new S3Client({});
const logger = new Logger({ serviceName: "generateSubtitles" });
const tracer = new Tracer({ serviceName: "generateSubtitles" });

export const handler = async (event, context) => {
  logger.addContext({ awsRequestId: context.awsRequestId });
  logger.info("Subtitle generation started", { event });

  const { items, transcriptUrl, s3_bucket, s3_key, output_bucket, format } = event;
  const targetBucket = output_bucket || s3_bucket;

  const finalItems = items || (await downloadJson(transcriptUrl)).results.items;
  const baseKey = s3_key.replace(/\.[^/.]+$/, "");
  const uploads = [];

  if (format === "0" || format === "BOTH") {
    const srt = generateSRT(finalItems);
    uploads.push(uploadToS3(targetBucket, `subtitles/${baseKey}.srt`, srt));
  }

  if (format === "2" || format === "BOTH") {
    const vtt = generateVTT(finalItems);
    uploads.push(uploadToS3(targetBucket, `subtitles/${baseKey}.vtt`, vtt));
  }

  await Promise.all(uploads);

  logger.info("Subtitle generation completed", { baseKey });
  return { message: "Subtitle generation complete", s3_key };
};

function downloadJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        logger.debug("Downloaded transcript JSON");
        resolve(JSON.parse(data));
      });
    }).on("error", (err) => {
      logger.error("Error downloading transcript JSON", { error: err });
      reject(err);
    });
  });
}

function uploadToS3(bucket, key, body) {
  tracer.putAnnotation("S3UploadKey", key);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "text/plain"
  }));
}

function generateSRT(items) {
  let output = "", index = 1;
  const chunks = group(items);
  for (const group of chunks) {
    const start = format(group[0].start_time, false);
    const end = format(group[group.length - 1].end_time, false);
    const text = group.map(w => w.alternatives[0].content).join(" ");
    output += `${index++}\n${start} --> ${end}\n${text}\n\n`;
  }
  return output;
}

function generateVTT(items) {
  let output = "WEBVTT\n\n";
  const chunks = group(items);
  for (const group of chunks) {
    const start = format(group[0].start_time, true);
    const end = format(group[group.length - 1].end_time, true);
    const text = group.map(w => w.alternatives[0].content).join(" ");
    output += `${start} --> ${end}\n${text}\n\n`;
  }
  return output;
}

function group(items) {
  const groups = [], group = [];
  for (const item of items) {
    if (item.type !== 'pronunciation') continue;
    group.push(item);
    const start = parseFloat(group[0].start_time);
    const end = parseFloat(item.end_time);
    if (end - start >= 5.0) {
      groups.push([...group]);
      group.length = 0;
    }
  }
  if (group.length) groups.push(group);
  return groups;
}

function format(seconds, vtt) {
  const date = new Date(0);
  date.setSeconds(parseFloat(seconds));
  const iso = date.toISOString();
  return vtt ? iso.substr(11, 12).replace('.', '.') : iso.substr(11, 12).replace('.', ',');
}
