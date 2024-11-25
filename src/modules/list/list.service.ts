import { AppDataSource } from '@src/core/config/database/data-source';
import { BadRequestError } from '@src/core/errors/bad-request';
import { ForbiddenError } from '@src/core/errors/forbidden';
import { InternalError } from '@src/core/errors/internal';
import { NotFoundError } from '@src/core/errors/not-found';
import { BrevoPort } from '@src/core/ports/brevo/brevo';
import type { Repository } from 'typeorm';
import User from '../user/user-model';
import ListInvitation, { InvitationStatus } from './invitation-model';
import List from './list-model';
import type { CreateSchema } from './list.request';
import UserList from './user-list-model';

class ListService {
  private _repository: Repository<List>;
  private _userRepository: Repository<User>;
  private _userListRepository: Repository<UserList>;
  private _invitationRepository: Repository<ListInvitation>;

  private _brevoService: BrevoPort;

  constructor() {
    this._repository = AppDataSource.getRepository(List);
    this._userRepository = AppDataSource.getRepository(User);
    this._userListRepository = AppDataSource.getRepository(UserList);
    this._invitationRepository = AppDataSource.getRepository(ListInvitation);

    this._brevoService = new BrevoPort();
  }

  async create(userId: number, payload: CreateSchema): Promise<List> {
    try {
      const maxSpend = payload.maxSpend ? Number(payload.maxSpend) : null;

      const list = this._repository.create({
        ownerId: userId,
        name: payload.name,
        emoji: payload.emoji,
        maxSpend: maxSpend,
        totalPrice: null,
      });

      return await this._repository.save(list);
    } catch (error) {
      console.log(error);
      throw new InternalError(`An Error Occurred: ${error.message}`);
    }
  }

  async findListItems(listId: string, userId: number): Promise<List> {
    try {
      return await this._repository
        .createQueryBuilder('list')
        .leftJoinAndSelect('list.userLists', 'users')
        .leftJoinAndSelect('list.items', 'items')
        .leftJoinAndSelect('list.owner', 'owner')
        .where('list.id = :listId', { listId })
        .andWhere('(list.ownerId = :userId OR users.userId = :userId)', {
          userId,
        })
        .orderBy('list.createdAt', 'DESC')
        .addOrderBy('items.name', 'ASC')
        .getOne();
    } catch (error) {
      console.log(error);
      throw new InternalError(`An Error Occurred: ${error.message}`);
    }
  }

  async findLists(userId: number): Promise<List[]> {
    try {
      return await this._repository
        .createQueryBuilder('list')
        .leftJoinAndSelect('list.userLists', 'users')
        .where('list.ownerId = :userId', { userId })
        .orWhere('users.id = :userId', { userId })
        .orderBy('list.createdAt', 'DESC')
        .getMany();
    } catch (error) {
      console.log(error);
      throw new InternalError(`An Error Occurred: ${error.message}`);
    }
  }

  async delete(listId: string, userId: number) {
    try {
      const list = await this._repository.findOne({
        where: { id: Number(listId) },
      });

      if (!list) {
        throw new NotFoundError('List not found');
      }

      if (list.ownerId !== userId) {
        throw new ForbiddenError('You are not allowed to delete this list');
      }

      await this._repository.remove(list);
    } catch (error) {
      console.log(error);
      throw new InternalError(`An Error Occurred: ${error.message}`);
    }
  }

  async update(listId: string, userId: number, payload: Partial<CreateSchema>) {
    try {
      const list = await this._repository.findOne({
        where: { id: Number(listId) },
      });

      if (!list) {
        throw new NotFoundError('List not found');
      }

      if (list.ownerId !== userId) {
        throw new ForbiddenError('You are not allowed to update this list');
      }

      const maxSpend = payload.maxSpend ? Number(payload.maxSpend) : null;

      await this._repository.update(
        { id: Number(listId) },
        {
          name: payload.name,
          emoji: payload.emoji,
          maxSpend: maxSpend,
        },
      );
    } catch (error) {
      console.log(error);
      throw new InternalError(`An Error Occurred: ${error.message}`);
    }
  }

  async inviteToList(listId: string, invitedById: number, email: string) {
    const list = await this._repository.findOne({
      where: { id: Number(listId), ownerId: invitedById },
    });

    if (!list) {
      throw new NotFoundError("List not found or you don't have permission");
    }

    const existingInvitation = await this._invitationRepository.findOne({
      where: {
        listId: Number(listId),
        email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new BadRequestError('User already has a pending invitation');
    }

    const existingUser = await this._userRepository.findOne({
      where: { email },
    });

    const invitation = this._invitationRepository.create({
      email,
      listId: Number(listId),
      invitedById,
      userId: existingUser?.id,
      status: InvitationStatus.PENDING,
    });

    await this._invitationRepository.save(invitation);

    const invintingUser = await this._userRepository.findOne({
      where: { id: invitedById },
    });

    await this._brevoService.sendInvitationEmail({
      invitedBy: invintingUser.name,
      name: existingUser?.name || email.split('@')[0],
      to: email,
    });

    return invitation;
  }

  async acceptInvitation(
    invitationId: number,
    userId: number,
    accept: boolean,
  ) {
    const invitation = await this._invitationRepository.findOne({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
      },
      relations: ['list'],
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found or already processed');
    }

    const user = await this._userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.email !== invitation.email) {
      throw new BadRequestError(
        'This invitation was sent to a different email',
      );
    }

    invitation.status = accept
      ? InvitationStatus.ACCEPTED
      : InvitationStatus.REJECTED;
    invitation.userId = userId;

    await this._invitationRepository.save(invitation);

    if (accept) {
      const userList = new UserList();

      userList.userId = userId;
      userList.listId = invitation.listId;

      await this._userListRepository.save(userList);
    }

    return invitation;
  }

  async getPendingInvitations(userId: number) {
    const user = await this._userRepository.findOne({
      where: { id: userId },
    });

    return await this._invitationRepository.find({
      where: {
        email: user.email,
        status: InvitationStatus.PENDING,
      },
      relations: ['list', 'invitedBy'],
    });
  }
}

export default ListService;
