// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title QuestBadges
/// @notice ERC-721 contract for DeFi quest badges on Hedera.
contract QuestBadges is ERC721, Ownable {
    struct QuestInfo {
        bool exists;
        string name;
        string description;
        string uri;
        bool repeatable;
    }

    /// @notice next token ID to mint
    uint256 public nextTokenId = 1;

    /// @notice questId => QuestInfo
    mapping(uint256 => QuestInfo) public quests;

    /// @notice tokenId => questId
    mapping(uint256 => uint256) public tokenQuest;

    /// @notice user => questId => whether user has at least one badge for that quest
    mapping(address => mapping(uint256 => bool)) public hasBadgeForQuest;

    /// @notice custom token URIs (e.g. special editions)
    mapping(uint256 => string) private _customTokenURI;

    event QuestRegistered(uint256 indexed questId, string name);
    event QuestUpdated(uint256 indexed questId, string name);
    event BadgeMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 indexed questId
    );

    constructor() ERC721("Hedera DeFi Quest Badge", "HDQB") Ownable(msg.sender) {}

    // ============ Quest management (owner only) ============

    /// @notice Register or overwrite a quest definition.
    /// @dev You can call this multiple times to update the quest.
    function registerQuest(
        uint256 questId,
        string calldata name,
        string calldata description,
        string calldata uri,
        bool repeatable
    ) external onlyOwner {
        require(questId != 0, "QuestBadges: questId cannot be zero");

        QuestInfo storage q = quests[questId];
        bool isNew = !q.exists;

        q.exists = true;
        q.name = name;
        q.description = description;
        q.uri = uri;
        q.repeatable = repeatable;

        if (isNew) {
            emit QuestRegistered(questId, name);
        } else {
            emit QuestUpdated(questId, name);
        }
    }

    // ============ Minting (owner only) ============

    /// @notice Mint a badge for a specific quest to a user.
    /// @dev Owner will call this after off-chain verification.
    /// @param to Recipient wallet address (Hedera EVM style 0x address).
    /// @param questId The global quest ID (must be registered).
    /// @return tokenId The newly minted token ID.
    function mintBadge(
        address to,
        uint256 questId
    ) external onlyOwner returns (uint256 tokenId) {
        QuestInfo memory q = quests[questId];
        require(q.exists, "QuestBadges: quest not found");
        require(to != address(0), "QuestBadges: zero address");

        if (!q.repeatable) {
            require(
                !hasBadgeForQuest[to][questId],
                "QuestBadges: user already has badge for quest"
            );
        }

        tokenId = nextTokenId++;
        _safeMint(to, tokenId);

        tokenQuest[tokenId] = questId;
        hasBadgeForQuest[to][questId] = true;

        emit BadgeMinted(to, tokenId, questId);
    }

    // ============ Metadata ============

    /// @notice Set a custom URI for an individual token (optional).
    /// @dev For example, you might create a special limited edition version
    ///      for a tournament or seasonal event.
    function setCustomTokenURI(
        uint256 tokenId,
        string calldata newUri
    ) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "QuestBadges: nonexistent token");
        _customTokenURI[tokenId] = newUri;
    }

    /// @notice Returns the metadata URI for a token.
    /// @dev If a custom URI is set, that takes precedence; otherwise it falls
    ///      back to the quest's default URI.
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "QuestBadges: nonexistent token");

        string memory custom = _customTokenURI[tokenId];
        if (bytes(custom).length != 0) {
            return custom;
        }

        uint256 questId = tokenQuest[tokenId];
        QuestInfo memory q = quests[questId];
        return q.uri;
    }

    /// @dev We don't use a base URI in this design. URIs are fully set per quest/token.
    function _baseURI() internal pure override returns (string memory) {
        return "";
    }
}