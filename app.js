
const AWS = require("aws-sdk")
const codeBuildClient = new AWS.CodeBuild()


/**
 * @param {import('probot').Context} context 
 */
async function sayHi(context) {
    console.log("Saying hello!")
    return context.octokit.pulls.createReview({
        event: "COMMENT",
        body: "The bot is working!",
        ...context.pullRequest()
    })
}


/**
 * @param {import('probot').Context} context 
 */
function isIssueComment(context) {
    return context.name == 'issue_comment' || context.name == 'issue_comment.created'
}

/**
 * @param {import('probot').Context} context 
 */
async function runCi(context) {
    console.log("Running CI!")
    
    if (context.isBot) {
        console.log("Pull request review was a bot, will not do anything!")
        return;
    }

    console.log(`Starting test and build with url [ ${context.payload.repository.clone_url} ]`)

    var getHeadSha
    if (isIssueComment(context)) {
        const getPr = context.octokit.pulls.get({
            pull_number: context.payload.issue.number,
            ...context.repo()
        })
        getHeadSha = getPr.then(res => {
            console.log(res)
            return res.data.head.sha
        })
    } else {
        getHeadSha = Promise.resolve(context.payload.pull_request.head.sha)
    }

    const startCheck = (headSha) => {
        return context.octokit.checks.create({
            name: "BuildAndTest",
            head_sha: headSha,
            status: "in_progress",
            ...context.repo()
        })
    }

    const startBuild = new Promise((resolve, reject) => {
        codeBuildClient.startBuild({
            projectName: "BuildAndTest",
            environmentVariablesOverride: [
                {name: "PROJECT", value: context.payload.repository.clone_url}
            ]
        }, (err, data) => {
            if (err) reject(err)
            else resolve(data)
        })
    })


    return getHeadSha.then(headSha => {
        console.log(`The head sha is [ ${headSha} ]`)
        return startCheck(headSha)
    }).then(checkRes => {
        return startBuild.then(buildRes => ({
            checkRes,
            buildRes
        }))
    }).then(obj => {
        console.log(obj)
        return context.octokit.pulls.createReview({
            event: "COMMENT",
            body: `Running build and test!`,
            ...context.pullRequest()
        }) 
    })
}

/**
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
    console.log("Yay, the app was loaded!");

    app.on("pull_request.opened", sayHi)
    app.on("pull_request.reopened", sayHi)

    app.on("pull_request_review", runCi)
    app.on("commit_comment", runCi)
    app.on("issue_comment.created", runCi)
};
