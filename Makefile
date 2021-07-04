
build:
	sam build -u

local:
	ngrok http 3000
	sam local start-api -n local-envs.json --region eu-west-1
