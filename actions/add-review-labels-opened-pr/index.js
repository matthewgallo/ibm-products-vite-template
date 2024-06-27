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

async function run() {
  const { context, event } = github;
  console.log(context, event);
  const appId = core.getInput('APP_ID', {
    required: true,
  });
  const privateKey = core.getInput('APP_PRIVATE_KEY', {
    required: true,
  });
  const app = new App({ appId, privateKey, });
  const octokit = await app.getInstallationOctokit(52238220);

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

  const { data } = await octokit.request('GET /orgs/{org}/teams/{team_slug}', {
    org: 'mattgallo-org',
    team_slug: 'reviewing-team',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  const { members_url } = data;
  console.log(data, members_url);

  const org_id = members_url.split('organizations/').pop().split('/team')[0];
  const team_id = members_url.split('team/').pop().split('/members')[0];
  console.log({org_id, team_id});
  const {data: teamMembers} = await octokit.request('GET /organizations/{org_id}/team/{team_id}/members', {
    org_id,
    team_id,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  });

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
