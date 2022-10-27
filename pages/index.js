import { useEffect, useState } from 'react'
import Head from 'next/head'
import Web3 from 'web3'
import { ethers } from 'ethers'
import { NftSwapV3 } from "@traderxyz/nft-swap-sdk"

export default function Third() {
  const [account, setAccount] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  // const [signOutputs, setSignOutputs] = useState('')
  // const [verifyOutputs, setVerifyOutputs] = useState('')

  useEffect(() => {
    connectWalletHandler()
  }, [])

  const connectWalletHandler = async () => {
    const web3 = new Web3(window.ethereum)
    const accounts = await web3.eth.getAccounts()

    if (accounts.length === 0) {
      console.log('connecting to MetaMask')
      await window.ethereum.request({ method: 'eth_requestAccounts' }) //connecting to MetaMask

      console.log('Connecting to your MetaMask')
    }

    const walletAddress = accounts[0]
    const account = {
      address: walletAddress,
      balance: await getUserBalance(walletAddress)
    }

    setAccount(account)
    setIsConnected(true)
  }

  const getUserBalance = async (address) => {
    const web3 = new Web3(window.ethereum)

    return web3.eth.getBalance(address).then(balance => {
      return ethers.utils.formatEther(balance)
    })
  }

  const signMessageHandler = async () => {
    const web3 = new Web3(window.web3.currentProvider || window.ethereum)

    const signature = await web3.eth.personal.sign(messageInput, account.address)

    console.log('signature', signature)
  }

  const verifyMessageHandler = async () => {
    const web3 = new Web3(window.web3.currentProvider || window.ethereum)

    const signerAddress = web3.eth.accounts.recover(message, signature)

    if (signerAddress !== account.address) {
      console.error('VerifyMessage: Invalid Signature')
      return;
    }

    console.info('VerifyMessage: Valid Signature')
  }

  const signOrder = async (payload) => {
    const provider = new ethers.providers.Web3Provider(ethereum, "any")
    const gasPrice = (await provider.getGasPrice()).mul(2)
    const maker = payload.maker
    const taker = payload.taker

    maker.amount = Web3.utils.toWei(maker.amount, 'ether')

    /**
     * UserA = Buyer
     * UserB = Seller
     */
    const assetsToSwapUserB = taker
    const assetsToSwapUserA = maker

    const signer = provider.getSigner()
    const makerAddress = await signer.getAddress()

    console.log('zero')

    const takerAddress = taker.takerWalletAddress
    const nftSwapSdk = new NftSwapV3(provider, signer, 4)

    console.log('zero1')

    let approvalStatusForUserA
    await nftSwapSdk
      .loadApprovalStatus(assetsToSwapUserA, makerAddress)
      .then(
        (data) => {
          console.log('approved?', data)
          approvalStatusForUserA = data;
        },
        (data) => {
          console.log('not approved?', data)
          let errorMessage = {};
          errorMessage.message = "Something went wrong !! Please try again."
        }
      );

    console.log('zero2', approvalStatusForUserA)
    if (typeof approvalStatusForUserA == "undefined") {
      return;
    }

    console.log('zero3')
    if (!approvalStatusForUserA.contractApproved) {
      let approvalTx
      let errorMessage = {}
      await nftSwapSdk
        .approveTokenOrNftByAsset(assetsToSwapUserA[0], makerAddress, {
          gasPrice: gasPrice._hex,
        })
        .then(
          function (data) {
            approvalTx = data
          },
          function (data) {
            if (data.code == "UNPREDICTABLE_GAS_LIMIT") {
              errorMessage.message = "Insufficient ETH to cover gas costs"
              self.callback(true, errorMessage.message)
            }
          }
        )

      if (errorMessage) {
        throw errorMessage
      }

      if (!approvalTx) {
        return
      }

      await approvalTx.wait()
    }

    console.log('zero4')
    
    const order = nftSwapSdk.buildOrder(
      assetsToSwapUserA,
      assetsToSwapUserB,
      makerAddress,
      {
        takerAddress,
        feeRecipientAddress: "0x0000000000000000000000000000000000000000",
      }
    )

    console.log('buildOrder', order)

    let signedOrder
    await nftSwapSdk.signOrder(order, takerAddress).then(
      function (data) {
        self.signedOrder = data
          (self.auctionData.is_buy_now) ? self.placeBuyNowOrder() : self.placeSignedBid()
      },
      function (data) {
      }
    )

    if (!signedOrder) {
      return
    }
  }

  const swapHandler = async () => {

    const payload = {
      "maker": {
        "tokenAddress": "0xc778417e063141139fce010982780140aa0cd5ab",
        "type": "ERC20",
        "amount": "810000000000000000"
      },
      "taker": {
        "takerWalletAddress": "0x48C0E3fC56ccc81444bCDDA71bae39416007Ea30",
        "tokenAddress": "0xa3DE5a1A6122D277b9eb9002FE23662298561e3f",
        "tokenId": "1",
        "type": "ERC721"
      }
    }

    signOrder(payload)

    // if (signerAddress !== account.address) {
    //   console.error('VerifyMessage: Invalid Signature')
    //   return;
    // }

    // console.info('VerifyMessage: Valid Signature')
  }

  return (
    <div className="antialiased font-sans bg-black h-screen">
      <Head>
        <title>Helper App MetaMask</title>
      </Head>

      <main className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:flex lg:items-center lg:justify-between lg:py-16 lg:px-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-700 sm:text-4xl">
            <span className="block">Helper MetaMask Wallet</span>
          </h2>
        </div>

        {!isConnected ? (
          <div className="inline-flex rounded-md shadow">
            <button
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-5 py-3 text-base font-medium text-white hover:bg-indigo-700"
              onClick={() => connectWalletHandler()}>Connect to MetaMask v2</button>
          </div>
        ) : (
          <div className="flex flex-col rounded-md shadow text-white">
            <div className="flex flex-col mb-4">
              <span>Balance: {account?.balance}</span>
              {/* <span>Payload: {payload}</span> */}
              <span>Wallet: {account?.address}</span>
            </div>

            <div className="flex flex-col mb-4">
              <label htmlFor="payload" className='text-indigo-500'>Message</label>
              <textarea
                className="bg-gray-800 text-indigo-500 rounded-md px-5 py-3 text-base font-medium mt-4"
                onChange={(e) => setMessageInput(e.target.value)}
              />
            </div>

            <div className="flex flex-col mb-4">
              <label htmlFor="payload" className='text-indigo-400'>Signature</label>
              <textarea
                className="bg-gray-800 text-indigo-400 rounded-md px-5 py-3 text-base font-medium mt-4"
                onChange={(e) => setSignatureInput(e.target.value)}
              />
            </div>

            <button
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-500 px-5 py-3 text-base font-medium text-white hover:bg-indigo-700 mt-4"
              onClick={() => signMessageHandler()}>Sign Message</button>

            <button
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-5 py-3 text-base font-medium text-white hover:bg-indigo-700 mt-4"
              onClick={() => verifyMessageHandler()}>Verify Signature</button>

            <button
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-700 px-5 py-3 text-base font-medium text-white hover:bg-indigo-800 mt-4"
              onClick={() => swapHandler()}>Swap</button>
          </div>
        )}
      </main>

      <div className="font-bold text-indigo-900 bottom-0 p-8 absolute">
        <span>GoodPeople.club</span>
      </div>
    </div>
  )
}
