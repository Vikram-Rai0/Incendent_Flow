
export function getAllUsers(id:string){
    const uid = id;
   if(!uid){
    return null;
   }
   const result = prisma.users.getAllusers(data);
   return result;
 
}