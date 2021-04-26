/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                // setting a block to a new block with data in body
                let blockObj = block;
                // add block height property by increasing the chain height by one
                blockObj.height = self.height + 1;
                // create a timestamp and store it in time property
                blockObj.time = parseInt(new Date().getTime().toString().slice(0,-3));
                // encode the entire object by making it a string, applying SHA256 algo, & returning a string
                // stored in hash propery
                blockObj.hash = SHA256(JSON.stringify(blockObj)).toString();
                // is the block height is different than 0
                if (blockObj.height !== 0){
                    // get the previous block using the .getBlockByHeight method
                    const previousBlock = await self.getBlockByHeight(self.height);
                    // store it in the previousBlockHash property
                    blockObj.previousBlockHash = previousBlock.hash;
                } 
                // push the object to the chain's array property
                this.chain.push(blockObj);
                // update the chain's height property
                this.height = blockObj.height;
                // resolve by returning the block object
                resolve(blockObj);
           } catch(err){
               // or reject with an error.
               reject(new Error("Block cannot be added"));
           }
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            resolve(address + ":" + new Date().getTime().toString().slice(0, -3) + ":starRegistry");
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            // get the time from the messagesent as parameter `parseInt(message.split(':')[1]`)
            let messageTime = parseInt(message.split(':')[1]);
            // get the current time
            let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
            // returns true if time elapsed is less than 5 minutes
            let underFiveMin = currentTime - messageTime <= 300
            // returns true if msg is verified
            let verified = bitcoinMessage.verify(message, address, signature)
            // if submission under five minutes & message verified
            if (underFiveMin && verified) {
                // create a new block with the star and owner as data
                let block = new BlockClass.Block({"star":star, "owner":address});
                // add block to blockchain.
                await this._addBlock(block);
                resolve(block);
            } else {
                // else reject with error.
                reject("Star could not be submitted.")
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            try {
                // search for blocks that have a .hash property equal to the hash provided
                const foundBlock = self.chain.filter(block => block.hash === hash)[0];
                // resolve with the block
                resolve(foundBlock);
            } catch {
                // or reject with an error
                reject("Block not found");
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            // for each element in the chain
            self.chain.forEach(async (block) => {
                // apply .getBData
                let object = await block.getBData();
                // if the block is other than 0
                if (block.height !== 0) {
                    // and if the star owner is equal to the supplied address
                    if (object.owner === address) {
                        // push the star to the stars array
                        stars.push(object.star);
                    }
                }
            });
            // resolve with the stars array
            resolve(stars);
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            // for each element in the chain
            self.chain.forEach( (block) => {
                // if the block's height is 0
                if (block.height === 0 ) {
                    block.validate() ? true :
                    // and the block does not validate, push the error below to errorLog
                    errorLog.push('Genesis Block does not Validate');
                } else {
                    // else if the block's height is other than 0
                    block.validate() ? true :
                    // and the block does not validate, push the error below to the errorLog
                    errorLog.push('Block ${block.height} does not validate')
                    // if the block's previousBlockHash property is not the same as
                    block.previousBlockHash === self.chain[block.height - 1].hash ? true :
                    // the chain's previous block hash, push the erro below to the errorLog
                    errorLog.push('Block ${block.height} previous hash does not validate');
                }
            });
            // finally, resolve with the errorLog array
            resolve(erroLog);
        });
    }

}

module.exports.Blockchain = Blockchain;   