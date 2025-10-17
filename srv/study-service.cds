using { com.study as my } from '../db/schema';

service StudyService {
    entity Books as projection on my.Books;
    entity Authors as projection on my.Authors;
};
