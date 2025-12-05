import subprocess

Map_URL = "https://sendbird.chilipiper.com/concierge-js/cjs/concierge.js.map"



# 1. Loading the SourceMap

command = 'sourcemapper -url "https://sendbird.chilipiper.com/concierge-js/cjs/concierge.js.map" -output ./test -proxy "http://127.0.0.1:8080"'

print(f"Executing command: {command}")
result = subprocess.run(command, shell=True, capture_output=True, text=True)

print("Command output:")
print(result.stdout)
print("Command error (if any):")
print(result.stderr)

# 2. Git automation (only commit/push if there are changes)
subprocess.run(["git", "add", "."], check=False)

# Check if there are staged changes
status_result = subprocess.run(
    ["git", "status", "--porcelain"],
    capture_output=True,
    text=True
)

if status_result.stdout.strip():
    subprocess.run(["git", "commit", "-m", "Auto-update extracted sources"], check=False)
    subprocess.run(["git", "push"], check=False)
    print("Changes detected. Commit and push complete.")
else:
    print("No changes detected. Skipping commit and push.")
