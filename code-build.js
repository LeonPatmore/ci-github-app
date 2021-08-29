function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function isBuildSuccessful(id) {
    let i = 0
    do {
        console.log(`Waiting for code build, attempt [ ${i} ]`)
        const codeBuildResult = await new Promise((resolve, reject) => {
            codeBuildClient.batchGetBuilds({
                ids: [id]
            }, (err, data) => {
                if (err) reject(err)
                else resolve(data.builds)
            })
        })
        const buildStatus = codeBuildResult.builds[0].buildStatus
        console.log(`Build status is [ ${buildStatus} ]`)
        if (buildStatus == "SUCCEEDED") {
            return true
        } else if (buildStatus != "IN_PROGRESS") {
            return false
        }
        i++
        await sleep(5000)
    } while (i < 20)
    throw new Error("Timed out while waiting for build to finish!")
}

module.exports = { isBuildSuccessful }
