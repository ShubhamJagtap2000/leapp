import { Repository } from "./repository";
import { LeappNotification } from "../models/notification";

export class NotificationService {
  constructor(private repository: Repository) {}

  getNotifications(unread?: boolean): LeappNotification[] {
    if (unread !== undefined && unread === true) {
      return this.repository.getNotifications().filter((n: LeappNotification) => !n.read);
    }
    return this.repository.getNotifications();
  }

  setNotificationAsRead(uuid: string): void {
    const notifications = this.getNotifications();
    notifications.forEach((n: LeappNotification) => {
      if (n.uuid === uuid) {
        n.read = true;
      }
    });
    this.repository.setNotifications(notifications);
  }
}
