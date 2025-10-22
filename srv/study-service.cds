using { com.study as my } from '../db/schema';

service StudyService {
    entity Books as projection on my.Books;
    entity Authors as projection on my.Authors;
    entity Notifications as projection on my.Notifications;
    
    // Custom action to mark notification as read
    action markNotificationAsRead(notificationId: UUID) returns Boolean;
    
    // Custom function to get unread count
    function getUnreadNotificationCount() returns Integer;
}