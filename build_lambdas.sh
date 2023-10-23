#!/bin/bash
# Build every lambda
# TODO this seems like overkill...

# Change to the 'src/lambdas' directory
cd ./src/lambdas

# Iterate through directories in 'src/lambdas'
for dir in *; do
  if [ -d "$dir" ] && [[ "$dir" == *Lambda ]]; then
    echo "Entering directory: $dir"
    cd "$dir"
    yarn build
    cd ..
  fi
done
