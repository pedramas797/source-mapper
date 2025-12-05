import requests
import sourcemap
import os
import subprocess

Map_URL = "https://sendbird.chilipiper.com/concierge-js/cjs/concierge.js.map"



# 1. Loading the SourceMap

command = 'sourcemapper -url {Map_url} -output ./test -proxy "http://127.0.0.1:2020"'


print(f"Executing command: {command}")
result = subprocess.run(command, shell=True, capture_output=True, text=True)


print("Command output:")
print(result.stdout)
print("Command error (if any):")
print(result.stderr)

# 2. Git automation
subprocess.run(["git", "add", "."], check=False)
subprocess.run(["git", "commit", "-m", "Auto-update extracted sources"], check=False)
subprocess.run(["git", "push"], check=False)

print("Git push complete.")
