import middy from "@middy/core";
import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import ddbUtil from "./libs/aws/ddbUtil.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {

	GetObjectCommand,
	S3Client,

} from "@aws-sdk/client-s3";
import { AwsCredentialIdentityProvider } from "@smithy/types";

export const apiSpec = {

	category: "download",
	event: [
		{
			type: "REST",
			method: "Get",
		},
	],
	desc: "사용자의 요청에 따라 파일을 다운로드 합니다.",
	parameters: {
		code: { type: "string", description: "다운로드할 파일의 코드" },

	},
	responses: {
		description: "",
	},
};

export async function lambdaHandler(event: APIGatewayProxyEvent & { v3TestProfile: AwsCredentialIdentityProvider }) {
	console.log(JSON.stringify(event));

	try {

		const { code } = event.queryStringParameters as any;
		const dynamoDBClient = new DynamoDBClient({
			region: "ap-northeast-2",
			credentials: event.v3TestProfile,
		});
		const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

		let data = await ddbUtil.query(docClient, `${process.env.service}-${process.env.stage}-data`, ["code"], [code], { rawTableName: true });

		if (data.Items.length === 0) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: "Not Found" }),
			};
		}
		const fileData = data.Items[0];



		let bucket = fileData.bucket
		let key = fileData.key
		let status = fileData.status
		const originalFilename = key.split("/").reverse()[0];

		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key,
			ResponseContentDisposition: `attachment; filename =${encodeURI(originalFilename)}`,
		});

		const url = await getSignedUrl(new S3Client({
			region: process.env.region!,
			credentials: event.v3TestProfile,
		}), command, { expiresIn: 6000 });

		console.log("return url", url);
		return {
			statusCode: 200,
			body: JSON.stringify({
				url: url
			}),
		};
	}
	catch (e) {
		console.log("error:", e);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Internal Server Error" }),
		};
	}

}
export const handler = middy().handler(lambdaHandler);
