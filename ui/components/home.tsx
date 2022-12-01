import React from "react";

function Home({ state, onSendTransaction, onRefreshCurrentNum }: any) {
  let hasWallet;
  if (!state.hasWallet) {
    const auroLink = "https://www.aurowallet.com/";
    const auroLinkElem = (
      <a href={auroLink} target="_blank" rel="noreferrer">
        [Link]
      </a>
    );
    hasWallet = (
      <div>
        {" "}
        Could not find a wallet. Install Auro wallet here: {auroLinkElem}{" "}
      </div>
    );
  }

  let setupText = state.hasBeenSetup
    ? "SnarkyJS Ready"
    : "Setting up SnarkyJS...";
  let setup = (
    <div>
      {" "}
      {setupText} {hasWallet}{" "}
    </div>
  );

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
    const faucetLink = `https://faucet.minaprotocol.com/?address=${state.publicKey!.toBase58()}`;
    accountDoesNotExist = (
      <div>
        Account Does Not Exist. Please visit the faucet to fund this account
        <a href={faucetLink} target="_blank" rel="noreferrer">
          [Link]
        </a>
      </div>
    );
  }

  let mainContent;
  if (state.hasBeenSetup && state.accountExists) {
    mainContent = (
      <div>
        <button
          style={{ margin: "20px", minHeight: "40px" }}
          onClick={onSendTransaction}
          disabled={state.creatingTransaction}
        >
          Send Transaction
        </button>
        <div>Current Number in zkApp: {state.currentNum!.toString()} </div>
        <button
          style={{ margin: "20px", minHeight: "40px" }}
          onClick={onRefreshCurrentNum}
        >
          Get Latest State
        </button>
      </div>
    );
  }

  console.log("--> ", state);
  return (
    <div className="center" style={{ textAlign: "center" }}>
      <div>{setup}</div>
      <div>{accountDoesNotExist}</div>
      <div>{mainContent}</div>
    </div>
  );
}

export default Home;
