import { useEffect, useState } from "react";
import ZkappWorkerClient from "../pages/zkappWorkerClient";
import { PublicKey, PrivateKey, Field } from "snarkyjs";

const useZkClient = () => {
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
    const initClient = async () => {
      setLoading(true);
      try {
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
            "B62qph2VodgSo5NKn9gZta5BHNxppgZMDUihf1g7mXreL4uPJFXDGDA"
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
          setLoading(false);
        }
      } catch (error) {
        setLoading(false);
        console.log("[ERROR]!! ", error);
      }
    };

    const getAccount = async () => {
      setLoading(true);
      if (appState.hasBeenSetup && !appState.accountExists) {
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
    };

    !loading && initClient();
    !loading && getAccount();
  }, [appState, appState.hasBeenSetup]);

  return { loading, appState };
};

export default useZkClient;
