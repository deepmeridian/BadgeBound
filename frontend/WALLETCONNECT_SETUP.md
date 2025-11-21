# WalletConnect Setup for HashPack Integration

## Getting a WalletConnect Project ID

1. Go to [Reown Cloud](https://cloud.reown.com/) (formerly WalletConnect Cloud)
2. Sign up or log in
3. Create a new project
4. Copy your Project ID
5. Add it to your `.env` file:

```bash
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

## Supported Wallets

- HashPack
- Kabila
- Dropp
- Any other wallet that supports WalletConnect on Hedera

## Troubleshooting

- Make sure your WalletConnect Project ID is valid
- Ensure HashPack extension is installed and enabled
- Check that your domain is added to the allowed domains in Reown Cloud project settings
