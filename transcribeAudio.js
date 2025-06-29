import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import crypto from 'crypto';
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";

//Lets Initialize the power tools
const logger = new Logger({ serviceName: "transcribeAudio" });
const tracer = new Tracer({ serviceName: "transcribeAudio" });

const transcribeClient = tracer.captureAWSv3Client(new TranscribeClient({}));

export const handler = async (event, context) => {
  const { s3_bucket, s3_key } = event;
  const jobName = `job-${crypto.randomUUID()}`;

  logger.addContext({
    awsRequestId: context.awsRequestId,
    s3_bucket,
    s3_key,
    jobName
  });

  logger.info("Starting transcription job", { jobName });

  await transcribeClient.send(new StartTranscriptionJobCommand({
    TranscriptionJobName: jobName,
    LanguageCode: 'en-US',
    Media: { MediaFileUri: `s3://${s3_bucket}/${s3_key}` },
    OutputBucketName: s3_bucket
  }));

  await new Promise(res => setTimeout(res, 3000));

  let transcriptUrl;

  while (true) {
    const data = await transcribeClient.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
    );
    const status = data.TranscriptionJob.TranscriptionJobStatus;

    if (status === 'COMPLETED') {
      transcriptUrl = data.TranscriptionJob.Transcript.TranscriptFileUri;
      logger.info("Transcription job completed", { transcriptUrl });
      break;
    }

    if (status === 'FAILED') {
      logger.error("Transcribe Job Failed", {
        reason: data.TranscriptionJob.FailureReason,
        job: data.TranscriptionJob
      });
      throw new Error("Transcription failed");
    }

    await new Promise(res => setTimeout(res, 4000));
  }

  return { ...event, transcriptUrl };
};
