'use client'

import { useEffect, useState } from 'react'
import {
    useAccount,
    useConnect,
    useDisconnect,
    usePublicClient,
    useWalletClient
} from 'wagmi'
import { parseUnits, formatUnits, toHex } from "viem"
import dayjs from 'dayjs';
import { MobileDateTimePicker } from '@mui/x-date-pickers';
import hookAbi from '../abis/NetVolumeOracle.json'
import tokenAbi from '../abis/MockERC20.json'
import poolSwapAbi from '../abis/PoolSwapTest.json'


const hookContractAddress = '0xC289326a18EDa1a5cbFa400D6933a765254Ad040';
const token0 = {
  address: "0x04409fe920940E6958738191f5974F79Ad5b51Dc",
  name: "Blue Chip Token",
  symbol: "BLU3CH1P",
  decimals: 18,
};
const token1 = {
  address: "0x554bb39508D3D62DB71c95F2fce5e097f5967aC1",
  name: "Meme Token",
  symbol: "M3M3",
  decimals: 18,
};
const poolKey = {
  currency0: token0.address,
  currency1: token1.address,
  fee: 3000,
  tickSpacing: 120,
  hooks: hookContractAddress,
};


function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient(); // For reading data
  const walletClient = useWalletClient(); // For writing (transactions)

  const [token0Balance, settoken0Balance] = useState("0");
  const [token1Balance, settoken1Balance] = useState("0");
  const [mintAmount0, setmintAmount0] = useState("0");
  const [mintAmount1, setmintAmount1] = useState("0");
  const [swapAmountToken0, setswapAmountToken0] = useState("0");
  const [swapAmountToken1, setswapAmountToken1] = useState("0");
  const [currentDateTime, setCurrentDateTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [twanvResult, setTwanvResult] = useState(null);


  const fetchBalances = async () => {
    if (!account.isConnected || !account.address) return;

    try {
      // Call `balanceOf` on both token contracts
      const [balance1, balance2] = await Promise.all([
        publicClient.readContract({
          address: token0.address,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [account.address],
        }),
        publicClient.readContract({
          address: token1.address,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [account.address],
        }),
      ]);

      settoken0Balance(formatUnits(balance1, token0.decimals));
      settoken1Balance(formatUnits(balance2, token1.decimals));
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
        const startTime = startDate.unix();
        const endTime = endDate ? endDate.unix() : undefined;
        const args = endTime ? [poolKey, startTime, endTime] : [poolKey, startTime];

        // Call the contract function using Viem
        const result = await publicClient.readContract({
          address: hookContractAddress,
          abi: hookAbi,
          functionName: "getNetVolume",
          args,
        });

        console.log("result: ", result);
        setTwanvResult({
          token0NetVolume: result[0].toString(),
          token1NetVolume: result[1].toString(),
        });
      } catch (error) {
        console.error("Query failed:", error);
        alert("Failed to query TWANV. Check the console for details.");
      }
    };

  const swapTokens = async (amountIn, tokenIn) => {
    if (!account.isConnected || !account.address || !walletClient.data) return;

    try {
      const amountInWei = parseUnits(amountIn, tokenIn.decimals);

      const testSettings = { takeClaims: false, settleUsingBurn: false};
      const swapParams = {
            zeroForOne: tokenIn.address === token0.address ? true : false,
            amountSpecified: -(amountIn),
            sqrtPriceLimitX96: tokenIn.address === token0.address ? 4295128740 : "1461446703485210103287273052203988822378723970341",
      };
      const hookData = toHex("");

      const args = [poolKey, swapParams, testSettings, hookData];
        
      // Execute the `swap` function
      const tx = await walletClient.data.writeContract({
        address: "0x96E3495b712c6589f1D2c50635FDE68CF17AC83c",
        abi: poolSwapAbi,
        functionName: "swap",
        args: args
      });

      console.log(`Swap Transaction`, tx);
      
      // refresh balance after waiting for tx receipt
      await publicClient.waitForTransactionReceipt({ hash: tx })
      fetchBalances(); // Refresh balances after swapping
    } catch (error) {
      console.error(`Failed to swap tokens:`, error);
    }
  }


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
      <h4>{token0.name}: {token0.symbol}</h4>
      <p>Balance: {token0Balance}</p>
      <input
        type="number"
        value={mintAmount0}
        onChange={(e) => setmintAmount0(e.target.value)}
      />
      <button onClick={() => handleMint(token0, mintAmount0)}>Mint {token0.symbol}</button>
      <h4>{token1.name}: {token1.symbol}</h4>
      <p>Balance: {token1Balance}</p>
      <input
        type="number"
        value={mintAmount1}
        onChange={(e) => setmintAmount1(e.target.value)}
      />
      <button onClick={() => handleMint(token1, mintAmount1)}>Mint {token1.symbol}</button>
    </div>

    {/* Swap Tokens */}
    <div>
        <h2>Swap Tokens</h2>
        <p>Enter the amount of {token0.name} to swap for {token1.name}.</p>
        <input
            type="number"
            value={swapAmountToken0}
            onChange={(e) => setswapAmountToken0(e.target.value)}
        />
        <button onClick={() => swapTokens(swapAmountToken0, token0)}>Swap {token0.symbol} for {token1.symbol}</button>

        <p>Enter the amount of {token1.name} to swap for {token0.name}.</p>
        <input
            type="number"
            value={swapAmountToken1}
            onChange={(e) => setswapAmountToken1(e.target.value)}
        />
        <button onClick={() => swapTokens(swapAmountToken1, token1)}>Swap {token1.symbol} for {token0.symbol}</button>
    </div>

    {/* Query TWANV */}
    <div>
      <h2>Query TWANV</h2>
      <p>Select a start and end date to query the Time-Weighted Average Net Volume.</p>
      <p>Current date time: {currentDateTime}</p>
      <MobileDateTimePicker
        value={startDate}
        onChange={(date) => setStartDate(date)}
        views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
      />
      <MobileDateTimePicker
        value={endDate}
        onChange={(date) => setEndDate(date)}
        views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
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
