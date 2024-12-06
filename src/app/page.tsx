'use client'

import { useEffect, useState } from 'react'
import {
    useAccount,
    useConnect,
    useDisconnect,
    usePublicClient,
    useWalletClient
} from 'wagmi'
import { parseUnits, formatUnits } from "viem"
import { DateTimePicker } from '@mui/x-date-pickers';
import hookAbi from '../abis/NetVolumeOracle.json'
import tokenAbi from '../abis/MockERC20.json'


const hookContractAddress = '0x5675fbC66019148AAb306C1aDf490fa12eD1D040';
const token1 = {
  address: "0x8464135c8f25da09e49bc8782676a84730c318bc",
  name: "Token1",
  symbol: "TK1",
  decimals: 18,
};
const token2 = {
  address: "0x71c95911e9a5d330f4d621842ec243ee1343292e",
  name: "Token2",
  symbol: "TK2",
  decimals: 18,
};


function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient(); // For reading data
  const walletClient = useWalletClient(); // For writing (transactions)

  const [token1Balance, setToken1Balance] = useState("0");
  const [token2Balance, setToken2Balance] = useState("0");
  const [mintAmount1, setMintAmount1] = useState("0");
  const [mintAmount2, setMintAmount2] = useState("0");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [twanvResult, setTwanvResult] = useState(null);


  const fetchBalances = async () => {
    if (!account.isConnected || !account.address) return;

    try {
      // Call `balanceOf` on both token contracts
      const [balance1, balance2] = await Promise.all([
        publicClient.readContract({
          address: token1.address,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [account.address],
        }),
        publicClient.readContract({
          address: token2.address,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [account.address],
        }),
      ]);

      setToken1Balance(formatUnits(balance1, token1.decimals));
      setToken2Balance(formatUnits(balance2, token2.decimals));
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    }
  };

  const handleMint = async (token, amount) => {
    if (!account.isConnected || !account.address || !walletClient.data) return;

    try {
      const amountInWei = parseUnits(amount, token.decimals);

      // Execute the `mint` function
      const tx = await walletClient.data.writeContract({
        address: token.address,
        abi: tokenAbi,
        functionName: "mint",
        args: [account.address, amountInWei],
      });

      console.log(`${token.symbol} Mint Transaction`, tx);
      
      // refresh balance after waiting for tx receipt
      await publicClient.waitForTransactionReceipt({ hash: tx })
      fetchBalances(); // Refresh balances after minting

    } catch (error) {
      console.error(`Failed to mint ${token.symbol}:`, error);
    }
  };

    const queryTWANV = async () => {
      if (!startDate || (!endDate && hookAbi.some((f) => f.name === "getNetVolume" && f.inputs.length === 2))) return;

      try {
        const startTime = Math.floor(startDate.getTime() / 1000); // Convert to UNIX timestamp
        const endTime = endDate ? Math.floor(endDate.getTime() / 1000) : undefined;

        const args = endTime ? [poolKey, startTime, endTime] : [poolKey, startTime];

        // Call the contract function using Viem
        const result = await publicClient.readContract({
          address: hookContractAddress,
          abi: hookAbi,
          functionName: "getNetVolume",
          args,
        });

        setTwanvResult({
          token0NetVolume: result.token0NetVolume.toString(),
          token1NetVolume: result.token1NetVolume.toString(),
        });
      } catch (error) {
        console.error("Query failed:", error);
        alert("Failed to query TWANV. Check the console for details.");
      }
    };

  useEffect(() => {
    if (account.isConnected) fetchBalances();
  }, [account.isConnected]);


  return (
    <>
      <div>
        <h2>Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === 'connected' && (
          <button type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>

      <div>
        {account.isConnected ? (<></>) : (
          <div>
            <h2>Connect</h2>
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connect({ connector })}
                type="button"
              >
                Connect Wallet
              </button>
            ))}
            <div>{status}</div>
            <div>{error?.message}</div>
          </div>
          )}
      </div>

    {/* Mint Tokens */}
    <div>
      <h2>Tokens</h2>
      <h4>Token1: {token1.symbol}</h4>
      <p>Balance: {token1Balance}</p>
      <input
        type="number"
        placeholder="Amount of Token1 to mint"
        value={mintAmount1}
        onChange={(e) => setMintAmount1(e.target.value)}
      />
      <button onClick={() => handleMint(token1, mintAmount1)}>Mint Token1</button>
      <h4>Token2: {token2.symbol}</h4>
      <p>Balance: {token2Balance}</p>
      <input
        type="number"
        placeholder="Amount of Token2 to mint"
        value={mintAmount2}
        onChange={(e) => setMintAmount2(e.target.value)}
      />
      <button onClick={() => handleMint(token2, mintAmount2)}>Mint Token2</button>
    </div>

    {/* Query TWANV */}
    <div>
      <h2>Query TWANV</h2>
      <p>Select a start and end date to query the Time-Weighted Average Net Volume.</p>
      <DateTimePicker
        value={startDate}
        onChange={(date) => setStartDate(date)}
      />
      <DateTimePicker
        value={endDate}
        onChange={(date) => setEndDate(date)}
      />
      <button onClick={queryTWANV}>Query</button>

      {twanvResult && (
        <div>
          <h3>TWANV Results:</h3>
          <p>Token0 Net Volume: {twanvResult.token0NetVolume}</p>
          <p>Token1 Net Volume: {twanvResult.token1NetVolume}</p>
        </div>
      )}
    </div>

    </>
  )
}

export default App
