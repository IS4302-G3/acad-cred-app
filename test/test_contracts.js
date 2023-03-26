const _deploy_contracts = require('../migrations/2_deploy_contracts');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js'); // npm install bignumber.js
var assert = require('assert');

const oneEth = new BigNumber(1000000000000000000); // 1 eth
const zeroAddress = '0x0000000000000000000000000000000000000000';

const toUnixTime = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return Math.floor(date.getTime() / 1000);
};

const toDate = unixTimestamp => new Date(unixTimestamp * 1000);

var AcceptanceVoting = artifacts.require('../contracts/AcceptanceVoting.sol');
var Credential = artifacts.require('../contracts/Credential.sol');
var Institution = artifacts.require('../contracts/Institution.sol');

contract('Unit Test', function (accounts) {
  before(async () => {
    acceptanceVotingInstance = await AcceptanceVoting.deployed();
    credentialInstance = await Credential.deployed();
    institutionInstance = await Institution.deployed();
  });

  console.log('Testing Institution and Acceptance Voting contract');

  it('Add Institution', async () => {
    // Create approved institution
    let makeI1 = await institutionInstance.addInstitution(
      'National University of Singapore',
      'Singapore',
      'Singapore',
      '1.290270',
      '103.851959',
      { from: accounts[1] },
    );
    await assert.notStrictEqual(makeI1, undefined, 'Failed to add institution');
    truffleAssert.eventEmitted(makeI1, 'add_institution');
  });

  it('Incorrect Add Institution', async () => {
    // Institution name cannot be empty
    await truffleAssert.reverts(
      institutionInstance.addInstitution(
        '', // Empty institution name
        'Singapore',
        'Singapore',
        '1.290270',
        '103.851959',
        { from: accounts[1] },
      ),
      'Institution name cannot be empty',
    );

    // Institution country cannot be empty
    await truffleAssert.reverts(
      institutionInstance.addInstitution(
        'National University of Singapore',
        '', // Empty institution name
        'Singapore',
        '1.290270',
        '103.851959',
        { from: accounts[1] },
      ),
      'Institution country cannot be empty',
    );

    // Institution city cannot be empty
    await truffleAssert.reverts(
      institutionInstance.addInstitution(
        'National University of Singapore',
        'Singapore',
        '', // Empty institution city
        '1.290270',
        '103.851959',
        { from: accounts[1] },
      ),
      'Institution city cannot be empty',
    );

    // Institution latitude cannot be empty
    await truffleAssert.reverts(
      institutionInstance.addInstitution(
        'National University of Singapore',
        'Singapore',
        'Singapore',
        '', // Empty institution latitude
        '103.851959',
        { from: accounts[1] },
      ),
      'Institution latitude cannot be empty',
    );

    // Institution longitude cannot be empty
    await truffleAssert.reverts(
      institutionInstance.addInstitution(
        'National University of Singapore',
        'Singapore',
        'Singapore',
        '1.290270',
        '', // Empty institution longitude
        { from: accounts[1] },
      ),
      'Institution longitude cannot be empty',
    );
  });

  it('Delete Institution', async () => {
    let deleteI1 = await institutionInstance.deleteInstitution(0, { from: accounts[1] });
    truffleAssert.eventEmitted(deleteI1, 'delete_institution');

    await truffleAssert.reverts(
      institutionInstance.deleteInstitution(0, { from: accounts[1] }),
      'Institution has already been deleted from the system.',
    );
  });

  //////////

  //console.log('Testing AcceptanceVoting contract');

  it('Add member', async () => {
    // Add member
    let makeM1 = await acceptanceVotingInstance.addCommitteeMember(accounts[6]);
    truffleAssert.eventEmitted(makeM1, 'new_committee_member');

    let makeM2 = await acceptanceVotingInstance.addCommitteeMember(accounts[7]);
    truffleAssert.eventEmitted(makeM2, 'new_committee_member');

    let makeM3 = await acceptanceVotingInstance.addCommitteeMember(accounts[8]);
    truffleAssert.eventEmitted(makeM3, 'new_committee_member');
  });

  it('Incorrect add member', async () => {
    // User cannot add member if user is not a chairman
    await truffleAssert.reverts(
      acceptanceVotingInstance.addCommitteeMember(accounts[9], { from: accounts[1] }),
      'Only Chairman can call this function',
    );

    // Current members cannot be added again
    await truffleAssert.reverts(acceptanceVotingInstance.addCommitteeMember(accounts[6]), 'User is already a current committee Member');
  });

  it('Remove member', async () => {
    // Add member
    let makeM3 = await acceptanceVotingInstance.removeCommitteeMember(accounts[8]);
    truffleAssert.eventEmitted(makeM3, 'remove_committee_member');
  });

  it('Incorrect remove member', async () => {
    // User cannot remove member if user is not a chairman
    await truffleAssert.reverts(
      acceptanceVotingInstance.removeCommitteeMember(accounts[7], { from: accounts[1] }),
      'Only Chairman can call this function',
    );

    // Current members cannot be added again
    await truffleAssert.reverts(acceptanceVotingInstance.removeCommitteeMember(accounts[8]), 'User is not a current committee Member');
  });

  it('Cannot vote when vote has not opened', async () => {
    // User cannot remove member if user is not a chairman
    await truffleAssert.reverts(
      acceptanceVotingInstance.vote(0, true, true, true, false, false, { from: accounts[6] }),
      'Applicant is not open for voting',
    );
  });

  it('Open vote', async () => {
    // Open vote
    let makeO1 = await acceptanceVotingInstance.openVote(0);
    truffleAssert.eventEmitted(makeO1, 'vote_open');
  });

  it('Vote', async () => {
    // Open vote
    let makeV1 = await acceptanceVotingInstance.vote(0, true, true, true, true, true, { from: accounts[6] });
    truffleAssert.eventEmitted(makeV1, 'voted');

    let makeV2 = await acceptanceVotingInstance.vote(0, true, true, true, true, true, { from: accounts[7] });
    truffleAssert.eventEmitted(makeV2, 'voted');
  });

  it('Cannot close vote', async () => {
    // Too early to close vote
    await truffleAssert.reverts(acceptanceVotingInstance.closeVote(0, 9), 'Deadline not up');
  });

  it('Close vote', async () => {
    // Open vote
    await acceptanceVotingInstance.changeDeadline(0);
    let makeC1 = await acceptanceVotingInstance.closeVote(0, 9);
    truffleAssert.eventEmitted(makeC1, 'vote_close');
  });

  it('Check approved status', async () => {
    // Open vote
    await institutionInstance.updateInstitutionStatus(0);
    let makeS1 = await institutionInstance.getInstitutionState(0);
    await assert.equal(makeS1, 0, 'Failed to approve institution');
  });

  it('Check pending status', async () => {
    // Open vote
    await institutionInstance.addInstitution('National University of Singaporea', 'Singapore', 'Singapore', '1.1', '101.1', {
      from: accounts[2],
    });
    let makeS2 = await institutionInstance.getInstitutionState(1);
    await assert.equal(makeS2, 1, 'Institution status not pending');
  });

  it('Check rejected status', async () => {
    // Open vote
    await acceptanceVotingInstance.openVote(1);
    await acceptanceVotingInstance.vote(1, true, true, true, true, true, { from: accounts[6] });
    await acceptanceVotingInstance.vote(1, false, false, true, true, false, { from: accounts[7] });
    await acceptanceVotingInstance.closeVote(1, 9);
    await institutionInstance.updateInstitutionStatus(1);
    let makeS3 = await institutionInstance.getInstitutionState(1);
    await assert.equal(makeS3, 2, 'Failed to reject institution');
  });

  //////////

  console.log('Testing Credential contract');

  it('Add Credential', async () => {
    // Create a credential with an expiry date
    let makeC1 = await credentialInstance.addCredential(
      'Lyn Tan',
      'A0123456L',
      'Information Systems',
      'Bachelor of Computing',
      'Dr Li Xiaofan',
      0, // Institution ID
      toUnixTime(2023, 3, 21), // Issuance date
      toUnixTime(2028, 3, 21), // Expiry date
      accounts[7], // Student A,
      { from: accounts[1], value: oneEth.dividedBy(100) },
    );
    await assert.notStrictEqual(makeC1, undefined, 'Failed to add credential');
    truffleAssert.eventEmitted(makeC1, 'add_credential');

    // Create a credential without an expiry date
    let makeC2 = await credentialInstance.addCredential(
      'Keith Chan',
      'A0654321K',
      'Artificial Intelligence Specialisation',
      'Master of Computing',
      'Professor Tan Kian Lee',
      0, // Institution ID
      toUnixTime(2023, 3, 21), // Issuance date
      0, // Expiry date
      accounts[8], // Student B,
      { from: accounts[1], value: oneEth.dividedBy(100) },
    );
    await assert.notStrictEqual(makeC2, undefined, 'Failed to add credential');
    truffleAssert.eventEmitted(makeC2, 'add_credential');
  });

  it('Incorrect Add Credential', async () => {
    // Cannot add credential with less than 0.01 ETH
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        'Lyn Tan',
        'A0123456L',
        'Information Systems',
        'Bachelor of Computing',
        'Dr Li Xiaofan',
        0, // Institution ID
        toUnixTime(2023, 3, 21), // Issuance date
        toUnixTime(2028, 3, 21), // Expiry date
        accounts[7], // Student A,
        { from: accounts[1], value: oneEth.dividedBy(1000) },
      ),
      'At least 0.01ETH needed to create credential',
    );

    // Create pending (not approved) institution
    let makeI3 = await institutionInstance.addInstitution(
      'Singapore Management University',
      'Singapore',
      'Singapore',
      '1.2963',
      '103.8502',
      { from: accounts[3] },
    );

    // Unapproved institutions cannot add credential
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        'Lyn Tan',
        'A0123456L',
        'Information Systems',
        'Bachelor of Computing',
        'Dr Li Xiaofan',
        2, // Institution ID
        toUnixTime(2023, 3, 21), // Issuance date
        toUnixTime(2028, 3, 21), // Expiry date
        accounts[7], // Student A,
        { from: accounts[2], value: oneEth.dividedBy(100) },
      ),
      'The institution must be approved to perform this function',
    );

    // Compulsory fields cannot be empty
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        '',
        'A0123456L',
        'Information Systems',
        'Bachelor of Computing',
        'Dr Li Xiaofan',
        0, // Institution ID
        toUnixTime(2023, 3, 21), // Issuance date
        0, // Expiry date
        accounts[7], // Student A,
        { from: accounts[1], value: oneEth.dividedBy(100) },
      ),
      'Student name cannot be empty',
    );
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        'Lyn Tan',
        '',
        'Information Systems',
        'Bachelor of Computing',
        'Dr Li Xiaofan',
        0, // Institution ID
        toUnixTime(2023, 3, 21), // Issuance date
        0, // Expiry date
        accounts[7], // Student A,
        { from: accounts[1], value: oneEth.dividedBy(100) },
      ),
      'Student number cannot be empty',
    );
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        'Lyn Tan',
        'A0123456L',
        '',
        'Bachelor of Computing',
        'Dr Li Xiaofan',
        0, // Institution ID
        toUnixTime(2023, 3, 21), // Issuance date
        0, // Expiry date
        accounts[7], // Student A,
        { from: accounts[1], value: oneEth.dividedBy(100) },
      ),
      'Course name cannot be empty',
    );
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        'Lyn Tan',
        'A0123456L',
        'Information Systems',
        '',
        'Dr Li Xiaofan',
        0, // Institution ID
        toUnixTime(2023, 3, 21), // Issuance date
        0, // Expiry date
        accounts[7], // Student A,
        { from: accounts[1], value: oneEth.dividedBy(100) },
      ),
      'Degree level cannot be empty',
    );
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        'Lyn Tan',
        'A0123456L',
        'Information Systems',
        'Bachelor of Computing',
        '',
        0, // Institution ID
        toUnixTime(2023, 3, 21), // Issuance date
        0, // Expiry date
        accounts[7], // Student A,
        { from: accounts[1], value: oneEth.dividedBy(100) },
      ),
      'Endorser name cannot be empty',
    );
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        'Lyn Tan',
        'A0123456L',
        'Information Systems',
        'Bachelor of Computing',
        'Dr Li Xiaofan',
        0, // Institution ID
        0, // Issuance date
        0, // Expiry date
        accounts[7], // Student A,
        { from: accounts[1], value: oneEth.dividedBy(100) },
      ),
      'Issuance date cannot be empty',
    );
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        'Lyn Tan',
        'A0123456L',
        'Information Systems',
        'Bachelor of Computing',
        'Dr Li Xiaofan',
        0, // Institution ID
        toUnixTime(2023, 8, 1), // Issuance date
        0, // Expiry date
        accounts[7], // Student A,
        { from: accounts[1], value: oneEth.dividedBy(100) },
      ),
      'Issuance date cannot be a future date. Please enter an issuance date that is today or in the past.',
    );
    await truffleAssert.reverts(
      credentialInstance.addCredential(
        'Lyn Tan',
        'A0123456L',
        'Information Systems',
        'Bachelor of Computing',
        'Dr Li Xiaofan',
        0, // Institution ID
        toUnixTime(2023, 3, 21), // Issuance date
        0, // Expiry date
        zeroAddress, // Student A,
        { from: accounts[1], value: oneEth.dividedBy(100) },
      ),
      'Student address cannot be empty',
    );
  });

  it('Delete Credential', async () => {
    let deleteC1 = await credentialInstance.deleteCredential(0, { from: accounts[1] });
    truffleAssert.eventEmitted(deleteC1, 'delete_credential');

    await truffleAssert.reverts(credentialInstance.deleteCredential(0, { from: accounts[1] }), 'Credential has already been deleted.');
  });

  it('Revoke Credential', async () => {
    let revokeC2 = await credentialInstance.revokeCredential(1, { from: accounts[1] });
    truffleAssert.eventEmitted(revokeC2, 'revoke_credential');

    await truffleAssert.reverts(credentialInstance.revokeCredential(1, { from: accounts[1] }), 'Credential has already been revoked.');

    await truffleAssert.reverts(credentialInstance.revokeCredential(0, { from: accounts[1] }), 'Only active credentials can be revoked');
  });

  it('Incorrect Delete Credential', async () => {
    await truffleAssert.reverts(credentialInstance.deleteCredential(1, { from: accounts[1] }), 'Only active credentials can be deleted');
  });

  it('View Credential by Id', async () => {
    //Add a credential (1st Credential of Remus)
    await credentialInstance.addCredential(
      'Remus Kwan',
      'A0223344L',
      'Computer Science',
      'Bachelor of Computing',
      'Dr Tan Keng Soon',
      0, // Institution ID
      toUnixTime(2023, 3, 26), // Issuance date
      toUnixTime(2028, 4, 21), // Expiry date
      accounts[9], // Student C,
      { from: accounts[1], value: oneEth.dividedBy(100) },
    );

    let credentialView = await credentialInstance.viewCredentialById(2, { from: accounts[1] });
    await assert.strictEqual(
      credentialView,
      `ID: 2\nStudent Name: Remus Kwan\nStudent Number: A0223344L\nCourse Name: Computer Science\nDegree Level: Bachelor of Computing\nEndorser Name: Dr Tan Keng Soon\nIssuance Date: 1679788800\nExpiry Date: 1839888000\nState: ACTIVE\nIssuer: ${accounts[1]}\nOwner: ${accounts[9]}\n`,
      'Student credential info is not correct',
    );
  });

  it('View Credentials by Student Name', async () => {
    //Add a second credential (2nd Credential of Remus)
    let makeC1 = await credentialInstance.addCredential(
      'Remus Kwan',
      'A0223344L',
      'Business Analytics',
      'Bachelor of Business Administration',
      'Dr Bock See',
      0, // Institution ID
      toUnixTime(2023, 3, 26), // Issuance date
      toUnixTime(2028, 4, 21), // Expiry date
      accounts[9], // Student C,
      { from: accounts[1], value: oneEth.dividedBy(100) },
    );

    let studentCredentials = await credentialInstance.viewAllCredentialsOfStudentByStudentName('Remus Kwan', { from: accounts[1] });
    await assert.strictEqual(
      studentCredentials,
      `ID: 2\nStudent Name: Remus Kwan\nStudent Number: A0223344L\nCourse Name: Computer Science\nDegree Level: Bachelor of Computing\nEndorser Name: Dr Tan Keng Soon\nIssuance Date: 1679788800\nExpiry Date: 1839888000\nState: ACTIVE\nIssuer: ${accounts[1]}\nOwner: ${accounts[9]}\nID: 3\nStudent Name: Remus Kwan\nStudent Number: A0223344L\nCourse Name: Business Analytics\nDegree Level: Bachelor of Business Administration\nEndorser Name: Dr Bock See\nIssuance Date: 1679788800\nExpiry Date: 1839888000\nState: ACTIVE\nIssuer: ${accounts[1]}\nOwner: ${accounts[9]}\n`,
      'Student credential info is not correct',
    );
  });

  it('View Credentials by Student Number', async () => {
    //Add a second credential (2nd Credential of Keith)
    //First credential of Keith is revoked
    await credentialInstance.addCredential(
      'Keith Chan',
      'A0654321K',
      'Law',
      'Bachelor of Laws',
      'Dr Lee Tiong Tsu',
      0, // Institution ID
      toUnixTime(2023, 3, 21), // Issuance date
      0, // Expiry date
      accounts[8], // Student B,
      { from: accounts[1], value: oneEth.dividedBy(100) },
    );

    let studentCredentials = await credentialInstance.viewAllCredentialsOfStudentByStudentNumber('A0654321K', { from: accounts[1] });

    await assert.strictEqual(
      studentCredentials,
      `Credential for student Keith Chan has been revoked\nID: 4\nStudent Name: Keith Chan\nStudent Number: A0654321K\nCourse Name: Law\nDegree Level: Bachelor of Laws\nEndorser Name: Dr Lee Tiong Tsu\nIssuance Date: 1679356800\nExpiry Date: 0\nState: ACTIVE\nIssuer: ${accounts[1]}\nOwner: ${accounts[8]}\n`,
      'Student credential info is not correct',
    );
  });

  it('View All Credentials', async () => {
    let allStudentCredentials = await credentialInstance.viewAllCredentials({ from: accounts[1] });

    //Observe that:
    //Id 0 (Lyn Tan) is not shown since credential was deleted, Id 1 (Keith Chan) credential was revoked
    //Id 2 and 3 for Remus's credentials, Id 4 for Keith credential shows up

    await assert.strictEqual(
      allStudentCredentials,
      `Credential for student Keith Chan has been revoked\nID: 2\nStudent Name: Remus Kwan\nStudent Number: A0223344L\nCourse Name: Computer Science\nDegree Level: Bachelor of Computing\nEndorser Name: Dr Tan Keng Soon\nIssuance Date: 1679788800\nExpiry Date: 1839888000\nState: ACTIVE\nIssuer: ${accounts[1]}\nOwner: ${accounts[9]}\nID: 3\nStudent Name: Remus Kwan\nStudent Number: A0223344L\nCourse Name: Business Analytics\nDegree Level: Bachelor of Business Administration\nEndorser Name: Dr Bock See\nIssuance Date: 1679788800\nExpiry Date: 1839888000\nState: ACTIVE\nIssuer: ${accounts[1]}\nOwner: ${accounts[9]}\nID: 4\nStudent Name: Keith Chan\nStudent Number: A0654321K\nCourse Name: Law\nDegree Level: Bachelor of Laws\nEndorser Name: Dr Lee Tiong Tsu\nIssuance Date: 1679356800\nExpiry Date: 0\nState: ACTIVE\nIssuer: ${accounts[1]}\nOwner: ${accounts[8]}\n`,
      'Student credential info is not correct',
    );
  });
  
});
