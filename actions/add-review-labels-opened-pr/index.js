/**
 * Copyright IBM Corp. 2020, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import github from '@actions/github';
import core from '@actions/core';
import { App } from "octokit";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

async function run() {
  const { context } = github;
  const appId = core.getInput('APP_ID', {
    required: true,
  });
  const privateKey = core.getInput('APP_PRIVATE_KEY', {
    required: true,
  });
  const app = new App({ appId, privateKey, });
  const octokit = await app.getInstallationOctokit(52201197);
  const resp = await octokit.request("GET /repos/{owner}/{repo}/branches", {
    owner: 'matthewgallo',
    repo: 'ibm-products-vite-template'
  });
  console.log(resp)

  const { pull_request: pullRequest, repository, review, action } = context.payload;
  const { state, draft } = pullRequest;

  // We only want to work with Pull Requests that are marked as open
  if (state !== 'open') {
    return;
  }

  // We only want to work with Pull Requests that are not draft PRs
  if (draft) {
    return;
  }

  // If the review was not an approval then we'll ignore the event
  if (review && review.state !== 'approved') {
    return;
  }

  const readyForReviewLabel = 'status: ready for review 👀';

  console.log(pullRequest, repository);

  // const { data: repoTeams } = await octokit.rest.repos.listTeams({
  //   owner: repository.owner,
  //   repo: repository.name,
  // });

  // console.log('repoTeams', repoTeams);

  const { data } = await octokit.request("GET /organizations/{org_id}/team/{team_id}", {
    org: 'mattgallo-org', // 'repository.owner.id', hard coding this value while testing in separate repo
    team_id: 'reviewing-team'
  });
  const { members_url } = data;
  console.log(data, members_url);

  const retrieveTeamMembers = async () => {
    const fixedMembersUrl = members_url.substring(0, members_url.lastIndexOf('{'));
    const response = await fetch(fixedMembersUrl, {
      method: "GET",
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      }
    });
 
    const members = await response.json();
    return members;
  }

  const teamMembers = await retrieveTeamMembers();
  console.log(teamMembers);

  if (action === 'reopened' || action === 'opened') {
    // Add ready for review label when PR is opened
    await octokit.rest.issues.addLabels({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: pullRequest.number,
      labels: [readyForReviewLabel],
    });
    return;
  }
}

run().catch((error) => {
  console.log(error);
  process.exit(1);
});
