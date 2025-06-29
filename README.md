# Transcend
Generating Subtitles from Audio using AWS Lambda & AI

## Overview
Transcend is a fully serverless pipeline that automates the transcription and subtitle generation for audio/video content. Built on AWS Lambda and integrated with Amazon Transcribe and other AI services, it simplifies the process of converting speech to text and exporting subtitles in SRT and VTT formats making content accessible and globally distributable.

## Inspiration
With over 11 years of experience in the Media and Entertainment industry, I’ve seen firsthand how international content owners struggle with subtitle creation — it's time-consuming, costly, and manually intensive. Transcend was born to solve this challenge using AI/ML and a cloud-native architecture.

## What It Does
- Takes media files from S3 (via event trigger)
- Automatically transcribes using Amazon Transcribe
- Optionally translates transcripts using Amazon Translate
- Generates SRT/VTT subtitles
- Stores final subtitles back to S3 for distribution

## How We Built It

The system is composed of **four core Lambda functions** orchestrated using AWS Step Functions:

| Lambda Function Name          | Responsibility                                                        |
|------------------------------|------------------------------------------------------------------------|
| `startTranscriptionWorkflow` | Triggered by S3 upload, starts the Step Function execution             |
| `transcribeAudio`            | Uses Amazon Transcribe to convert audio to text                        |
| `generateSubtitles`          | Parses transcript JSON and generates `.srt` and/or `.vtt` files        |
| `storeSubtitles`             | Uploads generated subtitle files to the target S3 bucket               |

Used **AWS Lambda Powertools** for:
- Structured Logging via `Logger`
- Distributed Tracing via `Tracer`

## Challenges We Ran Into
- Handling different subtitle formats (SRT, VTT) precisely
- Ensuring transcription polling doesn’t timeout
- Keeping cold starts low while chaining async Lambda executions

## Accomplishments We're Proud Of
- Serverless, low-cost and auto-scalable
- Fully automated subtitle generation
- Built-in support for translation and multi-format export

## What We Learned
- Deep dive into AWS Step Functions and Lambda chaining
- How to enhance observability using AWS Powertools
- Practical use of Amazon Transcribe and Translate

## What's Next for Transcend
- Real-time subtitling for live TV channels
- Genre detection using subtitle content
- Subtitle quality scoring and profanity filters

## AWS Lambda Usage

The application implements the required Lambda trigger as follows:
- `startTranscriptionWorkflow` is triggered by **S3 ObjectCreated** event.
- It initiates a Step Functions state machine which chains the other Lambda functions.
- All functions use **Lambda Powertools** for logging and tracing.
- Subtitles are saved in a `subtitles/` folder within the S3 bucket.
