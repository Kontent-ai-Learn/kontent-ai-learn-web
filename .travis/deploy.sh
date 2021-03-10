#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Skip deployment for pull requests
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
    exit 0
fi

# Only execute the following if the commit is made to the `master` or `develop` branches
if [ "$TRAVIS_BRANCH" == "master" ]; then
    GIT_DESTINATION_LIVE=$GIT_DESTINATION_LIVE_MASTER
    GIT_DESTINATION_PREVIEW=$GIT_DESTINATION_PREVIEW_MASTER
elif [ "$TRAVIS_BRANCH" == "develop" ]; then
    GIT_DESTINATION_LIVE=$GIT_DESTINATION_LIVE_DEVELOP
    # GIT_DESTINATION_PREVIEW=$GIT_DESTINATION_PREVIEW_DEVELOP
    GIT_DESTINATION_LIVE_TESTS=$GIT_DESTINATION_LIVE_DEVELOP_TESTS
else
    exit 0
fi

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

main () {
    touch deployment_info
    now="`date +%c`"
    echo "Time: $now; Build: $TRAVIS_BUILD_NUMBER; Branch: $TRAVIS_BRANCH; Commit: $TRAVIS_COMMIT" > deployment_info
    
    if [ "${GIT_DESTINATION_PREVIEW}" ]; then
        rm -rf .git
        {
            git config --global user.email "$GIT_USER_EMAIL" \
            && git config --global user.name "$GIT_USER_NAME" \
            && git init \
            && git add -A \
            && git commit --message "$TRAVIS_COMMIT_MESSAGE" \
            && git push --quiet --force --set-upstream "https://$GIT_USER_NAME:$GIT_PASSWORD@$GIT_DESTINATION_PREVIEW" master
        } || {
            exit 1
        }
    fi

    rm -rf .git
    {
        git init \
          && git add -A \
          && git commit --message "$TRAVIS_COMMIT_MESSAGE" \
          && git push --quiet --force --set-upstream "https://$GIT_USER_NAME:$GIT_PASSWORD@$GIT_DESTINATION_LIVE" master
    } || {
        exit 1
    }

    if [ "$TRAVIS_BRANCH" == "develop" ]; then
        rm -rf .git
        {
            git init \
            && git add -A \
            && git commit --message "$TRAVIS_COMMIT_MESSAGE" \
            && git push --quiet --force --set-upstream "https://$GIT_USER_NAME:$GIT_PASSWORD@$GIT_DESTINATION_LIVE_TESTS" master
        } || {
            exit 1
        }
    fi
}

main "$@"
