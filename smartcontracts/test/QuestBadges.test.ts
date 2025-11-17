import { expect } from "chai";
import { ethers } from "hardhat";

describe("QuestBadges", function () {
  async function deployContractFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const QuestBadges = await ethers.getContractFactory("QuestBadges");
    const questBadges = await QuestBadges.deploy();
    await questBadges.waitForDeployment();

    return { questBadges, owner, user1, user2 };
  }

  it("should deploy and set initial state", async function () {
    const { questBadges } = await deployContractFixture();
    const nextId = await questBadges.nextTokenId();
    expect(nextId).to.equal(1);
  });

  it("should allow owner to register a quest", async function () {
    const { questBadges } = await deployContractFixture();

    await expect(
      questBadges.registerQuest(
        1,
        "Swap on SaucerSwap",
        "Do a swap on SaucerSwap",
        "ipfs://questuri/1",
        false
      )
    ).to.emit(questBadges, "QuestRegistered");

    const quest = await questBadges.quests(1);
    expect(quest.exists).to.equal(true);
    expect(quest.name).to.equal("Swap on SaucerSwap");
  });

  it("should allow owner to mint a badge for a registered quest", async function () {
    const { questBadges, owner, user1 } = await deployContractFixture();

    await questBadges.registerQuest(
      1,
      "Swap Quest",
      "Perform a swap",
      "ipfs://uri1",
      false
    );

    await expect(questBadges.mintBadge(user1.address, 1))
      .to.emit(questBadges, "BadgeMinted")
      .withArgs(user1.address, 1, 1);

    const questId = await questBadges.tokenQuest(1);
    expect(questId).to.equal(1);

    const hasBadge = await questBadges.hasBadgeForQuest(user1.address, 1);
    expect(hasBadge).to.equal(true);
  });

  it("should prevent double-minting non-repeatable quests", async function () {
    const { questBadges, user1 } = await deployContractFixture();

    await questBadges.registerQuest(
      1,
      "Non-repeatable quest",
      "You can only do this once",
      "ipfs://uri",
      false
    );

    await questBadges.mintBadge(user1.address, 1);

    await expect(
      questBadges.mintBadge(user1.address, 1)
    ).to.be.revertedWith("QuestBadges: user already has badge for quest");
  });

  it("should allow repeatable quests to be minted multiple times", async function () {
    const { questBadges, user1 } = await deployContractFixture();

    await questBadges.registerQuest(
      5,
      "Repeatable quest",
      "You can do this multiple times",
      "ipfs://repeat",
      true
    );

    await questBadges.mintBadge(user1.address, 5);
    await questBadges.mintBadge(user1.address, 5);

    const nextId = await questBadges.nextTokenId();
    expect(nextId).to.equal(3);
  });

  it("should reject minting a badge for a non-existent quest", async function () {
    const { questBadges, user1 } = await deployContractFixture();

    await expect(
      questBadges.mintBadge(user1.address, 999)
    ).to.be.revertedWith("QuestBadges: quest not found");
  });

  it("should allow owner to set custom token URI", async function () {
    const { questBadges, user1 } = await deployContractFixture();

    await questBadges.registerQuest(
      1,
      "Quest",
      "Desc",
      "ipfs://default-uri",
      false
    );

    await questBadges.mintBadge(user1.address, 1);

    await questBadges.setCustomTokenURI(1, "ipfs://custom-uri");

    const uri = await questBadges.tokenURI(1);
    expect(uri).to.equal("ipfs://custom-uri");
  });
});