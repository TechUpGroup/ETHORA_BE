// https://instant-trading-testnet-api.buffer.finance/trades/user/active
const output = [
  {
    id: 2867,
    signature_timestamp: 1695294196,
    queued_timestamp: 1695294192,
    queue_id: 2849,
    strike: 2671892204519,
    period: 180,
    target_contract: "0xEEC110733a1aB51cd7D55fBA84eC9494fa5f3edc",
    user_partial_signature:
      "0xdfebeaef76ec92d3b225c52acc39dac0127038039c9b1952467da8d98ea26e4b2a6c245565a0c20e6b1f6d120bda0add81afbeb27b9949425c5d1ee7235f4f961c",
    user_full_signature:
      "0x161a8d5a74be1cc24786653fade8dd3c8152edb90f90158aabd11c88b4414d24281a6b534d4682eff74206400061cdbdc5c9aa7a2d62024bc760c0f3029304371c",
    user_address: "0xB13332f8d4E81df0709d9Ffa15CB42D8dC0839c3",
    trade_size: "5000000",
    allow_partial_fill: false,
    referral_code: "",
    trader_nft_id: 0,
    slippage: 5,
    settlement_fee: 1250,
    settlement_fee_sign_expiration: 1695380577,
    settlement_fee_signature:
      "0x42a79ea388e81363b0a0ddc4fc6df44ca995c1f987f1e745ab31684e46a37b9e41df21b6d53c5c04efe6e45755aa1a03c0877d4f15a773924e5a449334011c281c",
    expiration_time: 1695294372,
    is_above: false,
    state: "OPENED",
    option_id: 1699,
    is_limit_order: false,
    limit_order_expiration: 1695294192,
    environment: "421613",
    expiry_price: null,
    payout: null,
    close_time: null,
    limit_order_duration: 0,
    locked_amount: "8750008",
    is_cancelled: false,
    cancellation_reason: null,
    cancellation_timestamp: null,
    early_close_signature: null,
    user_close_timestamp: null,
    open_timestamp: 1695294192,
    token: "USDC",
    pending_operation: null,
  },
];

// DOWN
// https://instant-trading-testnet-api.buffer.finance/trade/create/?signature_timestamp=1695294857&strike=2674231974304&period=180&target_contract=0xEEC110733a1aB51cd7D55fBA84eC9494fa5f3edc&partial_signature=0x2df3c88dd41fb2aa9677b3f534d518ad19c4325f6ad07161a5dee1284ab5d5232693f089b2a8aa839f2bf358bd39913dce06e69f02b989bda1a0d5393fdeb00a1c&full_signature=0xfc506256763338b7617d087b7a3f1b0ec3fc4697c8443ee54959a5651affa6933078b89f8629423273c523ff0d518168a3f453612a2d488e05d93c60cfdf2da21c&user_address=0xB13332f8d4E81df0709d9Ffa15CB42D8dC0839c3&trade_size=5000000&allow_partial_fill=false&referral_code=&trader_nft_id=0&slippage=5&is_above=false&is_limit_order=false&limit_order_duration=0&settlement_fee=1250&settlement_fee_sign_expiration=1695381244&settlement_fee_signature=0xa9e4d51026deca59db45467e37a162acdf14889ca3d87a5a7d9cebd0b071ec1c1f129e0b46313233fff5ae6a41663880de7bcc4ff3e17b7168ae6d675678a6241c&environment=421613&token=USDC
// signature_timestamp=1695294857&strike=2674231974304&period=180&target_contract=0xEEC110733a1aB51cd7D55fBA84eC9494fa5f3edc&partial_signature=0x2df3c88dd41fb2aa9677b3f534d518ad19c4325f6ad07161a5dee1284ab5d5232693f089b2a8aa839f2bf358bd39913dce06e69f02b989bda1a0d5393fdeb00a1c&full_signature=0xfc506256763338b7617d087b7a3f1b0ec3fc4697c8443ee54959a5651affa6933078b89f8629423273c523ff0d518168a3f453612a2d488e05d93c60cfdf2da21c&user_address=0xB13332f8d4E81df0709d9Ffa15CB42D8dC0839c3&trade_size=5000000&allow_partial_fill=false&referral_code=&trader_nft_id=0&slippage=5&is_above=false&is_limit_order=false&limit_order_duration=0&settlement_fee=1250&settlement_fee_sign_expiration=1695381244&settlement_fee_signature=0xa9e4d51026deca59db45467e37a162acdf14889ca3d87a5a7d9cebd0b071ec1c1f129e0b46313233fff5ae6a41663880de7bcc4ff3e17b7168ae6d675678a6241c&environment=421613&token=USDC
// ====================================
// UP
// https://instant-trading-testnet-api.buffer.finance/trade/create/?signature_timestamp=1695295302&strike=2677580000000&period=180&target_contract=0xEEC110733a1aB51cd7D55fBA84eC9494fa5f3edc&partial_signature=0xfdb9250e5f969906dc3f732c6171f48b885f7d98b49d6ca2765cccca87da84df6d1e00fc20bd59f9933f39d2293239ec015f2e8957150e5dbf35650fac66744b1c&full_signature=0x842bcb19cade1d6ea4b0f766eec1d568f62cdf8dc851e02b096d4a485ac77059694a609dd4e7c7e440c61653c92508f98dbaca5a3872a8c9cba896dd84f62b3b1c&user_address=0xB13332f8d4E81df0709d9Ffa15CB42D8dC0839c3&trade_size=5000000&allow_partial_fill=false&referral_code=&trader_nft_id=0&slippage=5&is_above=true&is_limit_order=false&limit_order_duration=0&settlement_fee=1250&settlement_fee_sign_expiration=1695381689&settlement_fee_signature=0x88606e85167a107e2102f4fd341ad2d466db168814e4b0fd4cd12991ff75012875bb944029a8c5dd5e36c3204ba1dc31afd64405c00d73bd11d37269d17488b91b&environment=421613&token=USDC
// signature_timestamp=1695295302&strike=2677580000000&period=180&target_contract=0xEEC110733a1aB51cd7D55fBA84eC9494fa5f3edc&partial_signature=0xfdb9250e5f969906dc3f732c6171f48b885f7d98b49d6ca2765cccca87da84df6d1e00fc20bd59f9933f39d2293239ec015f2e8957150e5dbf35650fac66744b1c&full_signature=0x842bcb19cade1d6ea4b0f766eec1d568f62cdf8dc851e02b096d4a485ac77059694a609dd4e7c7e440c61653c92508f98dbaca5a3872a8c9cba896dd84f62b3b1c&user_address=0xB13332f8d4E81df0709d9Ffa15CB42D8dC0839c3&trade_size=5000000&allow_partial_fill=false&referral_code=&trader_nft_id=0&slippage=5&is_above=true&is_limit_order=false&limit_order_duration=0&settlement_fee=1250&settlement_fee_sign_expiration=1695381689&settlement_fee_signature=0x88606e85167a107e2102f4fd341ad2d466db168814e4b0fd4cd12991ff75012875bb944029a8c5dd5e36c3204ba1dc31afd64405c00d73bd11d37269d17488b91b&environment=421613&token=USDC
const output1 = {
  id: 2871,
  signature_timestamp: 1695294857,
  queued_timestamp: 1695294853,
  queue_id: 2853,
  strike: 2674231974304,
  period: 180,
  target_contract: "0xEEC110733a1aB51cd7D55fBA84eC9494fa5f3edc",
  user_partial_signature:
    "0x2df3c88dd41fb2aa9677b3f534d518ad19c4325f6ad07161a5dee1284ab5d5232693f089b2a8aa839f2bf358bd39913dce06e69f02b989bda1a0d5393fdeb00a1c",
  user_full_signature:
    "0xfc506256763338b7617d087b7a3f1b0ec3fc4697c8443ee54959a5651affa6933078b89f8629423273c523ff0d518168a3f453612a2d488e05d93c60cfdf2da21c",
  user_address: "0xB13332f8d4E81df0709d9Ffa15CB42D8dC0839c3",
  trade_size: "5000000",
  allow_partial_fill: false,
  referral_code: "",
  trader_nft_id: 0,
  slippage: 5,
  settlement_fee: 1250,
  settlement_fee_sign_expiration: 1695381244,
  settlement_fee_signature:
    "0xa9e4d51026deca59db45467e37a162acdf14889ca3d87a5a7d9cebd0b071ec1c1f129e0b46313233fff5ae6a41663880de7bcc4ff3e17b7168ae6d675678a6241c",
  expiration_time: null,
  is_above: false,
  state: "QUEUED",
  option_id: null,
  is_limit_order: false,
  limit_order_expiration: 1695294853,
  environment: "421613",
  expiry_price: null,
  payout: null,
  close_time: null,
  limit_order_duration: 0,
  locked_amount: null,
  is_cancelled: false,
  cancellation_reason: null,
  cancellation_timestamp: null,
  early_close_signature: null,
  user_close_timestamp: null,
  open_timestamp: 1695294853,
  token: "USDC",
};
