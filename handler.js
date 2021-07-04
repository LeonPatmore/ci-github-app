const {
    createLambdaFunction,
    createProbot,
} = require("@probot/adapter-aws-lambda-serverless");
const appFn = require('./app')
const getSecret = require('./secrets')

module.exports.webhooks = async (e, c) => {
    const secret = await getSecret('ci-github-app/webhook-secret')
    const privateKey = await getSecret('ci-github-app/private-key')
    const appId = await getSecret('ci-github-app/app-id')
    const b = await createLambdaFunction(appFn, {
        probot: createProbot({
            overrides: {
                secret,
                privateKey,
                appId
            }
        }),
    })(e, c)
    return b
}
