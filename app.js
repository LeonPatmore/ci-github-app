
const AWS = require("aws-sdk")
const codeBuildClient = new AWS.CodeBuild()


/**
 * 
 * @param {import('probot').Context} context 
 */
async function prOpened(context) {
    console.log("pr opened")

    return context.octokit.pulls.createReview({
        event: "COMMENT",
        body: "The bot is working!",
        ...context.pullRequest()
    })
}

/**
 * 
 * @param {import('probot').Context} context 
 */
async function prComment(context) {
    console.log("PR comment!")
    console.log(`Starting test and build with url [ ${context.payload.repository.clone_url} ]`)

    if (context.isBot) {
        console.log("Pull request review was a bot, will not do anything!")
        return;
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
    return startBuild.then(data => {
        console.log(data)
        return context.octokit.pulls.createReview({
            event: "COMMENT",
            body: `Running build and test!`,
            ...context.pullRequest()
        }) 
    }, err => {
        console.log("Err " + err)
        throw err
    })
}

/**
 * 
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
    console.log("Yay, the app was loaded!");
    app.on("issues.opened", async (context) => {
        console.log("Issue has been opened.")
        const issueComment = context.issue({
            body: "Thanks for opening this issue " + context.payload.sender.login,
        });
        return context.octokit.issues.createComment(issueComment);
    });

    app.on("pull_request.opened", prOpened)
    app.on("pull_request.reopened", prOpened)

    // app.on("pull_request_review", async (context) => {
    //     const body = context.payload.review.body
    //     return context.octokit.pulls.createReview({
    //         event: "COMMENT",
    //         body: `Running ${body}`,
    //         ...context.pullRequest()
    //     })
    // })

    app.on("pull_request_review", prComment)
    app.on("commit_comment", prComment)
};
