
/**
 * 
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
    console.log("Yay, the app was loaded!");
    app.on("issues.opened", async (context) => {
        console.log("hi")
        const issueComment = context.issue({
            body: "Thanks for opening this issue " + context.payload.sender.login,
        });
        return context.octokit.issues.createComment(issueComment);
    });
};
