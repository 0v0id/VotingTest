const Voting = artifacts.require("Voting");
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const constants = require('@openzeppelin/test-helpers/src/constants');


contract("Voting", accounts => {
    var _owner = accounts[0];
    var _voter1 = accounts[1];
    var _voter2 = accounts[2];
    var _voter3 = accounts[3];
    var _voter4 = accounts[4];
    var _outsider = accounts[5];
    var _proposal1 = "proposal 1";
    var _proposal2 = "p2";
    var _proposal3 = "p3";
    var _proposal4 = "p4";
    var _proposal5 = "p5";
    let VotingInstance;

    before (async function() { 
        VotingInstance = await Voting.new({from: _owner})
    });
    
    context ('at RegisteringVoters phase', () => {
        it ("has RegisteringVoters WorkflowStatus", async () => {
            expect (await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(BN(0));
        });

        it ("can add Voters when is the Owner (and can get a Voter when is a Voter)", async () => {
            await VotingInstance.addVoter(_voter1, {from: _owner});
            let voter = await VotingInstance.getVoter(_voter1, {from: _voter1});
            expect (voter.isRegistered).to.equal(true);
            await VotingInstance.addVoter(_voter2, {from: _owner});
            let voter2 = await VotingInstance.getVoter(_voter2, {from: _voter1});
            expect (voter2.isRegistered).to.equal(true);
            await VotingInstance.addVoter(_voter3, {from: _owner});
            let voter3 = await VotingInstance.getVoter(_voter3, {from: _voter1});
            expect (voter3.isRegistered).to.equal(true);
        });

        it ("cannot add Voters when is not the Owner", async () => {
            expectRevert (VotingInstance.addVoter(_voter4, {from: _voter1}), "Ownable: caller is not the owner");
            expectRevert (VotingInstance.addVoter(_voter4, {from: _outsider}), "Ownable: caller is not the owner");
        });

        it ("cannot duplicate Voters", async () => {
            expectRevert (VotingInstance.addVoter(_voter1, {from: _owner}), "Already registered");
        });

        it ("emits a VoterRegistered event when adds a Voter", async () => {
            addVoter = await VotingInstance.addVoter(_voter4, {from: _owner});
            expectEvent (addVoter, "VoterRegistered", {voterAddress: _voter4});
        });
        
        after (async function() { 
            await VotingInstance.startProposalsRegistering({from: _owner});
        });
    });

    context ('At ProposalsRegistrationStarted phase', () => {
        it ("has ProposalsRegistrationStarted WorkflowStatus", async () => {
            expect (await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(BN(1));
        });

        it ("can add Proposals when is a Voter", async () => {
            await VotingInstance.addProposal(_proposal1, {from: _voter1});
            let p1 = await VotingInstance.getOneProposal(BN(1), {from: _voter1});
            expect (p1.description).to.equal(_proposal1);
            await VotingInstance.addProposal(_proposal2, {from: _voter2});
            let p2 = await VotingInstance.getOneProposal(BN(2), {from: _voter3});
            expect (p2.description).to.equal(_proposal2);
            await VotingInstance.addProposal(_proposal3, {from: _voter3});
            let p3 = await VotingInstance.getOneProposal(BN(3), {from: _voter2});
            expect (p3.description).to.equal(_proposal3);
            await VotingInstance.addProposal(_proposal4, {from: _voter3});
            let p4 = await VotingInstance.getOneProposal(BN(4), {from: _voter3});
            expect (p4.description).to.equal(_proposal4);
        });

        it ("cannot add Proposals when is not a Voter", async () => {
            expectRevert (VotingInstance.addProposal(_proposal5, {from: _outsider}), "You're not a voter");
        });

        it ("cannot register empty Proposals", async () => {
            expectRevert (VotingInstance.addProposal("", {from: _voter1}), "Vous ne pouvez pas ne rien proposer");
        });
        
        it ("cannot add Voters anymore", async () => {
            expectRevert (VotingInstance.addVoter(_outsider, {from: _owner}), "Voters registration is not open yet");
        });

        it ("emits a ProposalRegistered event when adds a Proposal", async () => {
            addProposal = await VotingInstance.addProposal(_proposal5, {from: _voter3});
            expectEvent (addProposal, "ProposalRegistered", {proposalId: BN(5)});
        });
        
        after (async function() { 
            await VotingInstance.endProposalsRegistering({from: _owner});
        });
    });

    context ('At ProposalsRegistrationEnded phase', () => {
        it ("has ProposalsRegistrationEnded WorkflowStatus", async () => {
            expect (await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(BN(2));
        });
        
        it ("cannot add Proposals anymore", async () => {
            expectRevert (VotingInstance.addProposal("p5", {from: _voter1}), "Proposals are not allowed yet");
        });
        
        it ("cannot vote yet", async () => {
            expectRevert (VotingInstance.setVote(BN(1), {from: _voter1}), "Voting session havent started yet");
        });
        
        after (async function() { 
            await VotingInstance.startVotingSession({from: _owner});
        });
    });

    context ('At VotingSessionStarted phase', () => {
        it ("has VotingSessionStarted WorkflowStatus", async () => {
            expect (await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(BN(3));
        });

        it ("can vote when is a Voter", async () => {
            let proposal = await VotingInstance.getOneProposal(BN(1), {from: _voter1});
            voteCount = BN(proposal.voteCount);
            voteCount = voteCount.add(BN(1));
            await VotingInstance.setVote(BN(1), {from: _voter1});
            proposal = await VotingInstance.getOneProposal(BN(1), {from: _voter1});
            expect (proposal.voteCount).to.be.bignumber.equal(voteCount);
            let v = await VotingInstance.getVoter(_voter1, {from: _voter1});
            expect (v.votedProposalId).to.be.bignumber.equal(BN(1));
        });

        it ("cannot vote when is not a Voter", async () => {
            expectRevert (VotingInstance.setVote(BN(2), {from: _outsider}), "You're not a voter");
        });

        it ("cannot vote twice", async () => {
            expectRevert (VotingInstance.setVote(BN(2), {from: _voter1}), "You have already voted");
        });

        it ("cannot vote for unexisting Proposal", async () => {
            expectRevert (VotingInstance.setVote(BN(20), {from: _voter2}), "Proposal not found");
        });

        it ("emits a Voted event when adds a Vote", async () => {
            setVote = await VotingInstance.setVote(BN(1), {from: _voter2});
            expectEvent (setVote, "Voted", {voter: _voter2, proposalId: BN(1)});
        });
        
        after (async function() {
            await VotingInstance.setVote(BN(2), {from: _voter3});
            await VotingInstance.setVote(BN(3), {from: _voter4});
            await VotingInstance.endVotingSession({from: _owner});
        });
    });

    context ('At VotingSessionEnded phase', () => {
        it ("has VotingSessionEnded WorkflowStatus", async () => {
            expect (await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(BN(4));
        });
        
        it ("cannot Vote anymore", async () => {
            expectRevert (VotingInstance.setVote(BN(1), {from: _voter4}), "Voting session havent started yet");
        });

        it ("can tally votes when is the Owner", async () => {
            await VotingInstance.tallyVotes({from: _owner});
            let winningProposalID = BN(await VotingInstance.winningProposalID.call());
            expect (winningProposalID).to.be.bignumber.equal(BN(1));
            expect (await VotingInstance.workflowStatus.call()).to.be.bignumber.equal(BN(5));
        });
    });
});