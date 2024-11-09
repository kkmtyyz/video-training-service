import { Construct } from "constructs";
import { VtConfig } from "./config";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as mc from "aws-cdk-lib/aws-mediaconvert";
import * as logs from "aws-cdk-lib/aws-logs";
import { VtDynamoDb } from "./dynamodb";
import { VtS3 } from "./s3";

interface VtStepFunctionsProps {
  config: VtConfig;
  vtDynamoDb: VtDynamoDb;
  vtS3: VtS3;
}

export class VtStepFunctions extends Construct {
  mediaConvertStateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: VtStepFunctionsProps) {
    super(scope, id);
    const config = props.config;
    const vtDynamoDb = props.vtDynamoDb;
    const vtS3 = props.vtS3;

    // SNS
    const notificationTopic = new sns.Topic(
      this,
      "MediaConvertNotificationTopic",
    );

    // Elemental MediaConvert
    const mediaConvertRole = new iam.Role(this, "MediaConvertRole", {
      assumedBy: new iam.ServicePrincipal("mediaconvert.amazonaws.com"),
    });
    new iam.Policy(this, "MediaConvertRolePolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:Get*", "s3:List*"],
          resources: [vtS3.uploadBucket.bucketArn + "/*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:Put*"],
          resources: [
            vtS3.webBucket.bucketArn + config.staticContentsVideoPath + "/*",
          ],
        }),
      ],
    }).attachToRole(mediaConvertRole);

    const mediaConvertQueue = new mc.CfnQueue(this, "MediaConvertQueue", {});

    // Step Functions
    const inputParamConvertPass = new sfn.Pass(this, "InputParamConvertPass", {
      stateName: "Convert Input Param",
      parameters: {
        TrainingTitle: sfn.JsonPath.stringAt("$.training_title"),
        TrainingId: sfn.JsonPath.stringAt("$.training_id"),
        SourceBucketName: sfn.JsonPath.stringAt("$.bucket_name"),
        SourceS3Key: sfn.JsonPath.stringAt("$.s3key"),
      },
    });

    const mediaConvertCreateJobTask = new tasks.MediaConvertCreateJob(
      this,
      "MediaConvertCreateJobTask",
      {
        stateName: "Convert Video",
        createJobRequest: {
          Queue: mediaConvertQueue.attrArn,
          UserMetadata: {},
          Role: mediaConvertRole.roleArn,
          Settings: {
            TimecodeConfig: {
              Source: "ZEROBASED",
            },
            OutputGroups: [
              {
                CustomName: "test-hls-group",
                Name: "Apple HLS",
                Outputs: [
                  {
                    ContainerSettings: {
                      Container: "M3U8",
                      M3u8Settings: {
                        AudioFramesPerPes: 4,
                        PcrControl: "PCR_EVERY_PES_PACKET",
                        PmtPid: 480,
                        PrivateMetadataPid: 503,
                        ProgramNumber: 1,
                        PatInterval: 0,
                        PmtInterval: 0,
                        Scte35Pid: 500,
                        TimedMetadataPid: 502,
                        VideoPid: 481,
                        AudioPids: [
                          482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492,
                          493, 494, 495, 496, 497, 498,
                        ],
                      },
                    },
                    VideoDescription: {
                      Width: 640,
                      ScalingBehavior: "DEFAULT",
                      Height: 360,
                      TimecodeInsertion: "DISABLED",
                      AntiAlias: "ENABLED",
                      Sharpness: 50,
                      CodecSettings: {
                        Codec: "H_264",
                        H264Settings: {
                          InterlaceMode: "PROGRESSIVE",
                          ParNumerator: 1,
                          NumberReferenceFrames: 3,
                          Syntax: "DEFAULT",
                          FramerateDenominator: 1001,
                          GopClosedCadence: 1,
                          HrdBufferInitialFillPercentage: 90,
                          GopSize: 90,
                          Slices: 1,
                          GopBReference: "DISABLED",
                          HrdBufferSize: 1800000,
                          MaxBitrate: 5000000,
                          SlowPal: "DISABLED",
                          ParDenominator: 1,
                          SpatialAdaptiveQuantization: "ENABLED",
                          TemporalAdaptiveQuantization: "ENABLED",
                          FlickerAdaptiveQuantization: "DISABLED",
                          EntropyEncoding: "CABAC",
                          FramerateControl: "SPECIFIED",
                          RateControlMode: "QVBR",
                          CodecProfile: "MAIN",
                          Telecine: "NONE",
                          FramerateNumerator: 30000,
                          MinIInterval: 0,
                          AdaptiveQuantization: "HIGH",
                          CodecLevel: "LEVEL_3_1",
                          FieldEncoding: "PAFF",
                          SceneChangeDetect: "TRANSITION_DETECTION",
                          QualityTuningLevel: "SINGLE_PASS",
                          FramerateConversionAlgorithm: "DUPLICATE_DROP",
                          UnregisteredSeiTimecode: "DISABLED",
                          GopSizeUnits: "FRAMES",
                          ParControl: "SPECIFIED",
                          NumberBFramesBetweenReferenceFrames: 3,
                          RepeatPps: "DISABLED",
                        },
                      },
                      AfdSignaling: "NONE",
                      DropFrameTimecode: "ENABLED",
                      RespondToAfd: "NONE",
                      ColorMetadata: "INSERT",
                    },
                    AudioDescriptions: [
                      {
                        AudioTypeControl: "FOLLOW_INPUT",
                        AudioSourceName: "Audio Selector 1",
                        CodecSettings: {
                          Codec: "AAC",
                          AacSettings: {
                            AudioDescriptionBroadcasterMix: "NORMAL",
                            Bitrate: 96000,
                            RateControlMode: "CBR",
                            CodecProfile: "HEV1",
                            CodingMode: "CODING_MODE_2_0",
                            RawFormat: "NONE",
                            SampleRate: 48000,
                            Specification: "MPEG4",
                          },
                        },
                        LanguageCodeControl: "FOLLOW_INPUT",
                        AudioType: 0,
                      },
                    ],
                    NameModifier: "test_video_converted",
                  },
                ],
                OutputGroupSettings: {
                  Type: "HLS_GROUP_SETTINGS",
                  HlsGroupSettings: {
                    SegmentLength: 10,
                    "Destination.$": sfn.JsonPath.format(
                      "s3://" +
                        config.appDomain +
                        config.staticContentsVideoPath +
                        "/{}/{}",
                      sfn.JsonPath.stringAt("$.TrainingId"),
                      sfn.JsonPath.stringAt("$.TrainingId"),
                    ),
                    MinSegmentLength: 0,
                  },
                },
              },
            ],
            FollowSource: 1,
            Inputs: [
              {
                AudioSelectors: {
                  "Audio Selector 1": {
                    DefaultSelection: "DEFAULT",
                  },
                },
                VideoSelector: {},
                TimecodeSource: "ZEROBASED",
                "FileInput.$": sfn.JsonPath.format(
                  "s3://{}/{}",
                  sfn.JsonPath.stringAt("$.SourceBucketName"),
                  sfn.JsonPath.stringAt("$.SourceS3Key"),
                ),
              },
            ],
          },
          BillingTagsSource: "JOB",
          AccelerationSettings: {
            Mode: "DISABLED",
          },
          StatusUpdateInterval: "SECONDS_60",
          Priority: 0,
        },
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        resultPath: "$.Result",
      },
    );

    const updateTrainingItemTask = new tasks.DynamoUpdateItem(
      this,
      "UpdateTrainingItemTask",
      {
        stateName: "Update DynamoDB Training Item",
        table: vtDynamoDb.trainingTable,
        key: {
          TrainingId: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt("$.TrainingId"),
          ),
        },
        updateExpression: "SET VideoKey = :VideoKey",
        expressionAttributeValues: {
          ":VideoKey": tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.format(
              "video/{}/{}.m3u8",
              sfn.JsonPath.stringAt("$.TrainingId"),
              sfn.JsonPath.stringAt("$.TrainingId"),
            ),
          ),
        },
        resultPath: "$.Result",
      },
    );

    const successPass = new sfn.Pass(this, "SuccessPass", {
      stateName: "Success",
      parameters: {
        Status: "成功",
        TrainingTitle: sfn.JsonPath.stringAt("$.TrainingTitle"),
      },
    });

    const failPass = new sfn.Pass(this, "FailPass", {
      stateName: "Fail",
      parameters: {
        Status: "失敗",
        TrainingTitle: sfn.JsonPath.stringAt("$.TrainingTitle"),
      },
    });

    const notificationTopicPublishTask = new tasks.SnsPublish(
      this,
      "NotificationTopicPublishTask",
      {
        stateName: "Publish Notification Topic",
        topic: notificationTopic,
        subject: "【動画研修サービス】 研修作成メッセージ",
        message: sfn.TaskInput.fromText(
          sfn.JsonPath.format(
            "動画研修サービスからの自動送信です。\n以下研修の作成が{}しました。\n研修名: {}",
            sfn.JsonPath.stringAt("$.Status"),
            sfn.JsonPath.stringAt("$.TrainingTitle"),
          ),
        ),
      },
    );

    const definition = inputParamConvertPass
      .next(mediaConvertCreateJobTask)
      .next(updateTrainingItemTask)
      .next(successPass)
      .next(notificationTopicPublishTask);
    // Elemental MediaConvertとDynamoUpdateItemの例外はFailPassへ回す
    mediaConvertCreateJobTask.addCatch(failPass, { resultPath: "$.Result" });
    updateTrainingItemTask.addCatch(failPass, { resultPath: "$.Result" });
    failPass.next(notificationTopicPublishTask);

    const mediaConvertStateMachineRole = new iam.Role(
      this,
      "MediaConvertStateMachineRole",
      {
        assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
      },
    );
    new iam.Policy(this, "MediaConvertStateMachineRolePolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["iam:PassRole"],
          resources: [mediaConvertRole.roleArn],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["mediaconvert:*"],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["dynamodb:UpdateItem"],
          resources: [vtDynamoDb.trainingTable.tableArn],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["sns:Publish"],
          resources: [notificationTopic.topicArn],
        }),
      ],
    }).attachToRole(mediaConvertStateMachineRole);

    this.mediaConvertStateMachine = new sfn.StateMachine(
      this,
      "MediaConvertStateMachine",
      {
        role: mediaConvertStateMachineRole,
        definitionBody: sfn.DefinitionBody.fromChainable(definition),
        logs: {
          destination: new logs.LogGroup(
            this,
            "MediaConvertStateMachineLogGroup",
          ),
          level: sfn.LogLevel.ALL,
          includeExecutionData: true,
        },
      },
    );
  }
}
