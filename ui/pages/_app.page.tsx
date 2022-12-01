import "../styles/globals.css";
import { useEffect, useState } from "react";
import "./reactCOIServiceWorker";
import Image from "next/image";
import Home from "../components/home";

import ZkappWorkerClient from "./zkappWorkerClient";

import { PublicKey, PrivateKey, Field } from "snarkyjs";

let transactionFee = 0.1;

export default function App() {
  const [loading, setLoading] = useState(false);
  let [appState, setAppState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    currentNum: null as null | Field,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
  });

  // Do Setup
  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!appState.hasBeenSetup) {
        const zkappWorkerClient = new ZkappWorkerClient();

        console.log("Loading SnarkyJS...");
        await zkappWorkerClient.loadSnarkyJS();
        console.log("done");

        await zkappWorkerClient.setActiveInstanceToBerkeley();

        const mina = (window as any).mina;
        if (!mina) {
          setAppState({ ...appState, hasWallet: false });
          return;
        }

        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);

        console.log("Using key ", publicKey.toBase58());

        console.log("Checking if account exists...");
        const res = await zkappWorkerClient.fetchAccount({
          publicKey: publicKey!,
        });
        const accountExists = res.error === null;

        await zkappWorkerClient.loadContract();

        console.log("Compiling zkApp state...");
        await zkappWorkerClient.compileContract();
        console.log("zkApp compiled");

        const zkappPublicKey = PublicKey.fromBase58(
          "B62qoNLqt9dsWw5Czp4fdaAQE8UujCQu59rCe9VzZ3ukBBASahyDxco"
        );

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        console.log("getting zkApp state...");
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        const currentNum = await zkappWorkerClient.getNum();
        console.log("Current state: ", currentNum.toString());

        setAppState({
          ...appState,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
          currentNum,
        });
      }
      setLoading(false);
    })();
  }, []);

  // Wait for account to exist, if it didn't
  useEffect(() => {
    (async () => {
      if (appState.hasBeenSetup && !appState.accountExists) {
        setLoading(true);
        for (;;) {
          console.log("checking if account exists...");
          const res = await appState.zkappWorkerClient!.fetchAccount({
            publicKey: appState.publicKey!,
          });
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setAppState({ ...appState, accountExists: true });
        setLoading(false);
      }
    })();
  }, [appState, appState.hasBeenSetup]);

  const onSendTransaction = async () => {
    setAppState({ ...appState, creatingTransaction: true });
    setLoading(true);
    console.log("Sending TX...");

    await appState.zkappWorkerClient!.fetchAccount({
      publicKey: appState.publicKey!,
    });
    await appState.zkappWorkerClient!.createUpdateTransaction();

    console.log("Creating proof...");
    await appState.zkappWorkerClient!.proveUpdateTransaction();

    console.log("Getting TX JSON...");
    const transactionJSON =
      await appState.zkappWorkerClient!.getTransactionJSON();

    console.log("Requesting send transaction...");
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: "",
      },
    });

    console.log(
      "See transaction at https://berkeley.minaexplorer.com/transaction/" + hash
    );

    setAppState({ ...appState, creatingTransaction: false });
    setLoading(false);
  };

  const onRefreshCurrentNum = async () => {
    console.log("Getting ZkApp state...");
    await appState.zkappWorkerClient!.fetchAccount({
      publicKey: appState.zkappPublicKey!,
    });
    const currentNum = await appState.zkappWorkerClient!.getNum();
    console.log("Current State: ", currentNum.toString());

    setAppState({ ...appState, currentNum });
  };

  return (
    <div style={{ marginTop: "50px" }}>
      <h1 className="center">Mina zkIgnite, Cohort 0</h1>
      {loading && <div className="loader center"></div>}
      <Home
        state={appState}
        onSendTransaction={onSendTransaction}
        onRefreshCurrentNum={onRefreshCurrentNum}
      />
    </div>
  );
}
