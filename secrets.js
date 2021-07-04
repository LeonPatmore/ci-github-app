const AWS = require("aws-sdk")

const client = new AWS.SecretsManager();

async function getSecret(name) {
    return new Promise((resolve, reject) => {
        client.getSecretValue({ SecretId: name }, (err, data) => {
            if (err) reject(err)
            else resolve(data.SecretString)
        })
    })
}

module.exports = getSecret
