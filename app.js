const { isBuildSuccessful, startBuild } = require("./code-build");

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
async function getHeadSha(context) {
    if (isIssueComment(context)) {
        const getPr = context.octokit.pulls.get({
            pull_number: context.payload.issue.number,
            ...context.repo()
        })
        const res = await getPr;
        return res.data.head.sha;
    } else {
        return context.payload.pull_request.head.sha
    }
}

/**
 * @param {import('probot').Context} context 
 */
async function startCheck(name, context, headSha) {
    console.log(`Starting check run with name [ ${name} ]`)
    const res = await context.octokit.checks.create({
        name,
        head_sha: headSha,
        status: "in_progress",
        ...context.repo()
    });
    return res.data.id;
}

async function finishCheck(conclusion, checkRunId) {
    console.log(`Setting check [ ${checkRunId} ] to [ ${conclusion} ]`)
    await context.octokit.checks.update({
        status: 'completed',
        conclusion,
        check_run_id: checkRunId,
        ...context.repo()
    })
}

const CI_JOBS = {
    "push": {
        checkName: "Push to ECR",
        prAction: "Pushing to ECR",
        funcToCall: runPush
    },
    "test": {
        checkName: "Unit Tests",
        prAction: "Running unit tests",
        funcToCall: runUnitTest
    }
}

async function runUnitTest(context) {
    console.log(`Starting test and build with url [ ${context.payload.repository.clone_url} ]`)
    const buildId = await startBuild("BuildAndTest", [
        {name: "PROJECT", value: context.payload.repository.clone_url}
    ])
    return await isBuildSuccessful(buildId)
}

async function runPush(context) {
    console.log(`Starting push to ECR with url [ ${context.payload.repository.clone_url} ]`)
    const buildId = await startBuild("PushToECR", [
        {name: "PROJECT", value: context.payload.repository.clone_url}
    ])
    return await isBuildSuccessful(buildId)
}

async function runCiComponent(component, context) {
    const headSha = await getHeadSha(context)
    const checkId = await startCheck(component.checkName, context, headSha)
    await context.octokit.pulls.createReview({
        event: "COMMENT",
        body: `${component.prAction}!`,
        ...context.pullRequest()
    })
    const success = await component.funcToCall(context)
    if (success) {
        await finishCheck('success', checkId)
        await context.octokit.pulls.createReview({
            event: "COMMENT",
            body: `${component.prAction} has passed!`,
            ...context.pullRequest()
        })
    } else {
        await finishCheck('failure', checkId)
        await context.octokit.pulls.createReview({
            event: "COMMENT",
            body: `${component.prAction} has failed!`,
            ...context.pullRequest()
        })
    }
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

    const body = context.payload.comment.body

    if (body.startsWith("CI")) {
        const job = body.substring(3)
        console.log(`Trying to run job [ ${job} ]`)
        if (job in CI_JOBS) {
            await runCiComponent(CI_JOBS[job], context)
        } else {
            console.log(`Do not know how to run job [ ${job} ]`)
            await context.octokit.pulls.createReview({
                event: "COMMENT",
                body: `Sorry, not sure what to do for: ${job}`,
                ...context.pullRequest()
            })
        }
    }
}

/**
 * @param {import('probot').Context} context 
 */
async function runCiAll(context) {
    console.log("Running all CI without fail!")
    const jobs = Object.values(CI_JOBS).map(value => {
        return new Promise(resolve => {
            await runCiComponent(value, context)
            resolve()
        })
    })
    return new Promise.all(jobs)
}

/**
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
    console.log("Yay, the app was loaded!");
    app.on("pull_request.opened", runCiAll)
    app.on("pull_request_review", runCi)
    app.on("issue_comment.created", runCi)
};
