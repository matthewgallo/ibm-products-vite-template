/**
 * Copyright IBM Corp. 2020, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const github = require('@actions/github');
const core = require('@actions/core');

async function run() {
  const { context } = github;
  const token = core.getInput('REVIEW_LABEL', {
    required: true,
  });
  const octokit = new github.getOctokit(token);
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

  const { data: allReviews } = await octokit.rest.pulls.listReviews({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number: pullRequest.number,
    per_page: 100,
  });

  const additionalReviewLabel = 'status: one more review 👀';
  const readyForReviewLabel = 'status: ready for review 👀';

  console.log(pullRequest, repository);

  const { data } = await octokit.rest.teams.getByName({
    org: 'carbon-design-system', // 'repository.owner.id', hard coding this value while testing in separate repo
    team_slug: 'carbon-for-ibm-products-reviewers',
  });
  const { members_url } = data;

  const retrieveTeamMembers = async () => {
    const fixedMembersUrl = members_url.substring(0, members_url.lastIndexOf('{'));
    const response = await fetch(fixedMembersUrl);
 
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

  const { data: permissionLevel } =
    await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner: repository.owner.login,
      repo: repository.name,
      username: review.user.login,
    });

  // If the reviewer doesn't have one of the following permission levels
  // then ignore the event
  const acceptedPermissionLevels = new Set(['admin', 'write']);
  if (!acceptedPermissionLevels.has(permissionLevel.permission)) {
    return;
  }

  // The `listReviews` endpoint will return all of the reviews for the pull
  // request. We only care about the most recent reviews so we'll go through the
  // list and get the most recent review for each reviewer
  const reviewers = {};
  const reviews = [];

  // Process reviews in reverse order since they are listed from oldest to newest
  for (const review of allReviews.reverse()) {
    const { author_association: association, user } = review;
    // If we've already saved a review for this user we already have the most
    // recent review
    if (reviewers[user.login]) {
      continue;
    }

    // If the author of the review is not a collaborator we ignore it
    if (association !== 'COLLABORATOR') {
      continue;
    }

    reviewers[user.login] = true;
    reviews.push(review);
  }

  const approved = reviews.filter((review) => {
    return review.state === 'APPROVED';
  });

  if (approved.length > 0) {
    const hasReadyLabel = pullRequest.labels.find((label) => {
      return label.name === readyForReviewLabel;
    });
    // Remove ready for review label if there is at least one approval
    if (hasReadyLabel) {
      await octokit.rest.issues.removeLabel({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pullRequest.number,
        name: readyForReviewLabel,
      });
    }
  }

  if (approved.length === 1) {
    const hasAdditionalReviewLabel = pullRequest.labels.find((label) => {
      return label.name === additionalReviewLabel;
    });
    // Add the one more review label if there's at least one approval and it doesn't have the label already
    if (!hasAdditionalReviewLabel) {
      await octokit.rest.issues.addLabels({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pullRequest.number,
        labels: [additionalReviewLabel],
      });
    }
    return;
  }

  if (approved.length >= 2) {
    const hasAdditionalReviewLabel = pullRequest.labels.find((label) => {
      return label.name === additionalReviewLabel;
    });
    // Remove the one mor review label if there are at least 2 approvals
    if (hasAdditionalReviewLabel) {
      await octokit.rest.issues.removeLabel({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pullRequest.number,
        name: additionalReviewLabel,
      });
    }
    return;
  }
}

run().catch((error) => {
  console.log(error);
  process.exit(1);
});
