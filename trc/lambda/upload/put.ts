import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import middy from "@middy/core";
import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import axios from "axios";
import moment from "moment";
import { AwsCredentialIdentityProvider } from "@smithy/types";
import { Readable } from "stream";
import ddbUtil from "../download/libs/aws/ddbUtil.js";

export const apiSpec = {

    category: "Sqs",
    event: [
        {
            type: "REST",
            method: "Post",
        },
    ],
    desc: "desc",
    parameters: {
        code: { type: "string", description: "code" },
        bucket: { type: "string", description: "bucket" },
        key: { type: "string", description: "key" },
        description: { type: "string", description: "description" }
    },
    responses: {
        description: "",
    },
};

export async function lambdaHandler(event: APIGatewayProxyEvent & { v3TestProfile: AwsCredentialIdentityProvider }) {
    console.log(event);
    const body = event.body
    const { code,
        bucket,
        key,
        description

    } = event.body as any

    const dynamoDBClient = new DynamoDBClient({
        region: "ap-northeast-2",
        credentials: event.v3TestProfile,
    });
    const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

    const item = {
        "code": code,
        "bucket": bucket,
        "key": key,



        "description": description,
        "download": 0,
        "status": "active"
    }

    try {
        await ddbUtil.put(docClient, `${process.env.service}-${process.env.stage}-data`, item, { rawTableName: true });
    } catch (e) {
        console.log(e);
    }
    return {
        statusCode: 200,
        body: JSON.stringify({}),
    };
}

export const handler = middy().handler(lambdaHandler);
