import { ticketModel } from "../models/ticket.model.js";

class TicketManager {

  async createTicket(purchaser, amount, products) {
    try {
      console.log("🚀 ~ file: tickets.manager.js:11 ~ TicketManager ~ createTicket ~ products:", products)

      const newTicket = await ticketModel.create({
        purchaser,
        amount,
        products
      })
  
      return {
        message: 'Ticket created',
        ticket: newTicket,
      }
    } catch (error) {
      throw new Error('Error while emiting ticket')
    }
  }

}

export default new TicketManager();