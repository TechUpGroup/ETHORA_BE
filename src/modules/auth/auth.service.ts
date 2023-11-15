import { utils } from "ethers";
import { UsersService } from "modules/users/users.service";
import { Users } from "modules/users/schemas/users.schema";
import { v4 as uuidv4 } from "uuid";
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AuthMessage } from "./constants/auth-message.enum";
import { TokenTypes } from "./constants/token.constant";
import { ApproveDto, LoginDto, RegisterDto } from "./dto/login.dto";
import { IVerifySignature } from "./interfaces/token.interface";
import { TokensService } from "./token.service";
import { EthersService } from "modules/_shared/services/ethers.service";
import config from "common/config";
import { ContractName } from "common/constants/contract";
import { RegisterAbi__factory, RouterAbi__factory } from "common/abis/types";
import { SignerType } from "common/enums/signer.enum";
import { plainToInstance } from "class-transformer";
import { ContractsService } from "modules/contracts/contracts.service";
import BigNumber from "bignumber.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: TokensService,
    private readonly userService: UsersService,
    private readonly ethersService: EthersService,
    private readonly contractService: ContractsService,
  ) {}

  async getNonce(address: string) {
    const user = await this.userService.findOrCreateUserByAddress(address);
    return {
      address: user.address,
      nonce: user.nonce,
    };
  }

  async decodeAccessToken(accessToken: string): Promise<any /*ResponseUsersDto*/> {
    const decodedToken: any = await this.tokenService.verifyToken(accessToken, TokenTypes.ACCESS);
    if (!decodedToken) {
      throw new UnauthorizedException("UNAUTHORIZED");
    }
    return decodedToken;
  }

  async decodeAdminAccessToken(accessToken: string): Promise<any /*ResponseUsersDto*/> {
    const decodedToken: any = await this.tokenService.verifyToken(accessToken, TokenTypes.ADMIN_ACCESS);
    if (!decodedToken) {
      throw new UnauthorizedException("UNAUTHORIZED");
    }
    return decodedToken;
  }

  async logIn(loginDto: LoginDto) {
    const {
      network,
      address,
      signature,
      message = "Sign this message to prove you have access to this wallet in order to sign in to BO Finance\n\nNonce: ",
    } = loginDto;
    const user = await this.userService.getUserByAddress(address);
    // no signature so i commented these lines
    const isVerifiedUser = await this.verifySignature({
      signature: signature,
      address: user.address,
      message: message + user.nonce,
    });
    if (!isVerifiedUser) {
      throw new UnauthorizedException(AuthMessage.SIGNATURE_INVALID);
    }

    // TODO: create wallet oneCT
    const createWallet = await this.userService.createOrUpdateAccount(network, user.address);
    if (!createWallet) {
      throw new Error("Something was wrong!");
    }

    const [updatedUser, wallet, tokens] = await Promise.all([
      // update a new generated nonce to prevent user uses the current signature another time
      this.userService.updateNonce(user._id, uuidv4()),
      this.userService.findWalletByNetworkAndId(network, user._id),
      this.tokenService.generateAuthTokens(user),
    ]);

    return {
      user: {
        ...plainToInstance(Users, updatedUser.toObject()),
        isRegistered: wallet.isRegistered,
        isApproved: wallet.isApproved,
        isShouldApproved: wallet.isShouldApproved,
        lastApprovedDate: wallet.lastApproveDate,
      },
      tokens,
    };
  }

  async verifySignature(verifySignatureDto: IVerifySignature): Promise<boolean> {
    try {
      const { address, message, signature } = verifySignatureDto;
      const publicAddress = utils.recoverAddress(utils.arrayify(utils.hashMessage(message)), signature);
      return publicAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  async register(userId: string, dto: RegisterDto) {
    const { network, signature, isRegister } = dto;
    // call contract
    const user = await this.userService.findUserById(userId);
    const wallet = await this.userService.findWalletByNetworkAndId(network, user._id);
    const { oneCT, address } = user;

    if (wallet.isRegistered && isRegister) {
      throw new BadRequestException("Already registered");
    }
    if (!wallet.isRegistered && !isRegister) {
      throw new BadRequestException("Not yet register");
    }

    //
    const contract = this.ethersService.getContract(
      network,
      config.getContract(network, ContractName.REGISTER).address,
      RegisterAbi__factory.abi,
      SignerType.operator,
    );

    // process action
    try {
      if (isRegister) {
        await contract.estimateGas.registerAccount(oneCT, address, signature, {
          gasPrice: this.ethersService.getCurrentGas(network),
        });
        await contract.registerAccount(oneCT, address, signature, {
          gasPrice: this.ethersService.getCurrentGas(network),
        });
      } else {
        await contract.estimateGas.deregisterAccount(address, signature, {
          gasPrice: this.ethersService.getCurrentGas(network),
        });
        await contract.deregisterAccount(address, signature, {
          gasPrice: this.ethersService.getCurrentGas(network),
        });
      }
    } catch (e) {
      throw new BadRequestException(e);
    }

    wallet.isRegistered = isRegister;
    await wallet.save();

    //
    return true;
  }

  async approve(userId: string, dto: ApproveDto) {
    const { network, permit, isApprove } = dto;
    // call contract
    const user = await this.userService.findUserById(userId);
    const wallet = await this.userService.findWalletByNetworkAndId(network, user._id);
    const ctr = await this.contractService.getContractByName(ContractName.USDC, network);
    if (!ctr) {
      throw new NotFoundException("Token address not found");
    }
    const { address } = user;
    wallet.permit = permit as any;

    //
    const contract = this.ethersService.getContract(
      network,
      config.getContract(network, ContractName.ROUTER).address,
      RouterAbi__factory.abi,
      SignerType.operator,
    );

    if (!isApprove) {
      if (!wallet.isApproved) {
        throw new BadRequestException("Not approved");
      }
      try {
        const tuple = {
          value: "0",
          deadline: permit.deadline,
          v: permit.v,
          r: permit.r,
          s: permit.s,
          shouldApprove: true,
        };
        const revokeParams = [
          {
            tokenX: ctr.contract_address,
            user: address,
            permit: tuple,
          },
        ];
        await contract.estimateGas.revokeApprovals(revokeParams, {
          gasPrice: this.ethersService.getCurrentGas(network),
        });
        await contract.revokeApprovals(revokeParams, {
          gasPrice: this.ethersService.getCurrentGas(network),
        });
      } catch (e) {
        throw new BadRequestException(e);
      }

      wallet.isApproved = false;
      wallet.lastRevokeDate = new Date();
    } else {
      if (wallet.isApproved) {
        throw new BadRequestException("Already approved");
      }

      // process action
      try {
        const maxApprove = new BigNumber(
          "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        )
          .toFixed(0)
          .toString();
        const tuple = {
          value: maxApprove,
          deadline: permit.deadline,
          v: permit.v,
          r: permit.r,
          s: permit.s,
          shouldApprove: true,
        };
        await contract.estimateGas.approveViaSignature(ctr.contract_address, address, new Date().getTime(), tuple, {
          gasPrice: this.ethersService.getCurrentGas(network),
        });
        await contract.approveViaSignature(ctr.contract_address, address, new Date().getTime(), tuple, {
          gasPrice: this.ethersService.getCurrentGas(network),
        });
      } catch (e) {
        throw new BadRequestException(e);
      }
      wallet.isApproved = true;
      wallet.lastApproveDate = new Date();
    }
    await wallet.save();
    return true;
  }

  async logOut(refreshToken: string, isAdmin = false) {
    await this.tokenService.findAndRemoveRefreshToken(refreshToken, isAdmin);

    return {
      message: AuthMessage.LOGGED_OUT,
    };
  }

  async refreshToken(refreshToken: string) {
    const refreshTokenDoc = await this.tokenService.findAndRemoveRefreshToken(refreshToken);
    const userDoc = await this.userService.getUser(refreshTokenDoc.user);
    const newTokens = await this.tokenService.generateAuthTokens(userDoc);
    return {
      user: userDoc.id,
      tokens: newTokens,
    };
  }
}
