import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";

// lets intialize logger and tracer
const logger = new Logger({ serviceName: "startTranscriptionWorkflow" });
const tracer = new Tracer({ serviceName: "startTranscriptionWorkflow" });

// AWS Step Functions client
const sfnClient = new SFNClient({});

// Environment variables
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET;
const OUTPUT_FORMAT = process.env.OUTPUT_FORMAT;
const TRANSLATION_REQUIRED = process.env.TRANSLATION_REQUIRED === "true";
const TARGET_LANGUAGE = process.env.TARGET_LANGUAGE;

export const handler = async (event, context) => {
  logger.addContext({
    awsRequestId: context.awsRequestId,
  });

  tracer.putAnnotation("Service", "startTranscriptionWorkflow");

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    const input = {
      s3_bucket: bucket,
      s3_key: key,
      output_bucket: OUTPUT_BUCKET,
      format: OUTPUT_FORMAT,
      translate: TRANSLATION_REQUIRED,
      target_language: TARGET_LANGUAGE,
    };

    tracer.putMetadata("TranscriptionInput", input);

    logger.info("Starting Step Function", { input });

    await sfnClient.send(new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      input: JSON.stringify(input),
    }));
  }

  return { status: "Step Function started" };
};
