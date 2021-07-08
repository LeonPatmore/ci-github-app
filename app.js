
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

    app.on("pull_request_review", async (context) => {
        const body = context.payload.review.body
        return context.octokit.pulls.createReview({
            event: "COMMENT",
            body: `Running ${body}`,
            ...context.pullRequest()
        })
    })
};
