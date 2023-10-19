import { Router } from "express";
import cartsMongoModel  from "../dao/models/cartsMongo.models.js";
import userModel from "../dao/models/user.model.js";
import ticketsManager from "../dao/managers/tickets.manager.js";
import productMongoModel from "../dao/models/productsMongo.models.js";
import CartMongoManager from "../dao/managers/cartMongo.manager.js";
import ProductMongoManager from "../dao/managers/productMongo.manager.js";
import { Schema, model, Types } from "mongoose";
import { HttpResponse, EnumErrors } from "../middleware/error-handler.js";
import { passportCall } from "../utils/jwt.js";
import handlePolicies from "../middleware/handle-policies.middleware.js";
import CartController from "../controllers/cart.controller.js";
const { ObjectId } = Types;

const httpResp  = new HttpResponse;
const cartController = new CartController();



class CartsMongoRoutes {
  path = "/carts";
  router = Router();
  cartMongoManager = new CartMongoManager();
  productMongoManager = new ProductMongoManager();


  constructor() {
    this.initCartsMongoRoutes();
  }

  initCartsMongoRoutes() {
    //******* Crear un carrito nuevo con un array vacío de products ***********************
    //******  POST DE /api/v1/cartsmongo **************************************************    
    this.router.post(`${this.path}`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.createCart);

    //********** Obtener un carrito con Id de carrito *************************************
    //******  GET DE /api/v1/carts/:cid **************************************
    this.router.get(`${this.path}/:cid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.getCartById);

    //*********** Agregar un Id de  producto a un carrito dado por su Id *****************
    //******  POST DE /api/v1/carts/:cid/products/:pid *************
    this.router.post(`${this.path}/:cid/products/:pid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], cartController.createProductInCart);

    // Eliminar un Id de  producto de un carrito por medio de Id de carrito  **************
    //******  PUT DE /api/v1/cartsmongo/:cid/productMongo/:produtMongoId   ************
    this.router.delete(`${this.path}/:cid/products/:pid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], async (req, res) => {
      try{
        const { cid, pid } = req.params;
        const cart = await cartsMongoModel.findById({_id: cid});
        const index =  cart.products.findIndex(item => item.product === pid);
        if(index){
          const cartAux = cart;
          cartAux.products.splice(index,1);    
          await cartsMongoModel.updateOne({_id:cid}, cartAux);
          const cartUpdate = await cartsMongoModel.findById({_id: cid}); 
          return httpResp.OK(res,`the product by Id in cart by Id in Mongo Atlas deleted`, {cartUpdate: cartUpdate}); 
         
        }else{
          return httpResp.NotFound(res,`no existe el producto en este carrito`, {productId: pid}); 

        }
      } catch (error) {
        req.logger.fatal(
          `Method: ${req.method}, url: ${
            req.url
          } - time: ${new Date().toLocaleTimeString()
          } con ERROR: ${error.message}`);  
          return httpResp.Error(res,`the cart by Id in Mongo Atlas not deleted`, {error:EnumErrors.DATABASE_ERROR}); 

      }
      
    });

    //****** VACIAR el array de products de un carrito por medio de Id CARRITO ************
    //******  DELETE DE /api/v1/cartsmongo/:cid **********************************
    this.router.delete(`${this.path}/:cid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], async (req, res) => {
      try{
        const { cid} = req.params;
        let result = await cartsMongoModel.findOneAndUpdate({_id:`${cid}`},{products:[]});
        return httpResp.Ok(res,`cartsMongo DELETE all products sucessfully`, {result:result}); 

        // return res.json({ 
        //   message: `cartsMongo DELETE all products sucessfully`, 
        //   result:result });
        
      } catch (error) {
        req.logger.fatal(
          `Method: ${req.method}, url: ${
            req.url
          } - time: ${new Date().toLocaleTimeString()
          } con ERROR: ${error.message}`);  
          return httpResp.Error(res,`the cart by Id in Mongo Atlas not deleted`, {error:EnumErrors.DATABASE_ERROR}); 

      }
      
    });

    //******  Actualizar el array de products por medio de Id de carrito ******************
    //******  PUT DE /api/v1/cartsmongo/:cid  ************************************
    this.router.put(`${this.path}/:cid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], async (req, res) => {
      try{
        const { cid} = req.params;
        const arrayItemsProducts= req.body.products;
        let result = await cartsMongoModel.findOneAndUpdate({_id:`${cid}`},{products:arrayItemsProducts}, { new: true });
        return httpResp.OK(res,`cartsMongo update array of products with PUT sucessfully`, {result:result}); 

      } catch (error) {
        req.logger.fatal(
          `Method: ${req.method}, url: ${
            req.url
          } - time: ${new Date().toLocaleTimeString()
          } con ERROR: ${error.message}`);  
          return httpResp.Error(res,`cartsMongo NOT update array of products with PUT`, {error:EnumErrors.DATABASE_ERROR}); 

      }
    });

    //******  Actualizar  SÓLO la cantidad de ejemplares  del producto ********************
    //******* por cualquier cantidad pasada desde req.body.     ***************************
    //******  PUT DE /api/v1/cartsmongo/:cid/productMongo/:produtMongoId **********************************
    this.router.put(`${this.path}/:cid/products/:pid`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], async (req, res) => {
      try{
        let result = await cartsMongoModel.findOneAndUpdate(
          { _id: req.params.cid, "products.product": req.params.pid },
          { $set: { "products.$.quantity": req.body.quantity } },
          { new: true });   
          return httpResp.Ok(res,`cartsMongo PUT set quantity in product pid of cart cid`, {result:result}); 
      } catch (error) {
        req.logger.fatal(
          `Method: ${req.method}, url: ${
            req.url
          } - time: ${new Date().toLocaleTimeString()
          } con ERROR: ${error.message}`);   
          return httpResp.Error(res,`Error cartsMongo PUT NOT set quantity in product pid of cart cid`, {error:EnumErrors.DATABASE_ERROR});
      }
    });

    this.router.post(`${this.path}/:cid/purchase`,[passportCall("jwt"), handlePolicies(["ADMIN", "USER","PREMIUM"])], async (req, res) => {
      const { cid } = req.params;    
      try {
      // Corroboro la existencia del cart
      const cart = await this.cartMongoManager.getCartMongoByIdPopulate(cid);
           
        if (!cart)  return httpResp.BadRequest(res,'Cart not found',cart);

      // creo variables para almacenar productos cuyo stock es mejor a la compra, y otra para el monto total de la compra
      const outOfStock = [];
      let purchaseAmount = 0;

      // Itero sobre los productos del cart. 
      // Si tiene existencia suficiente: lo sumo al monto total de la compa, actualizo la existencia, y lo elimino del carrito.
      // Si no tiene existencia suficiente agrego al producto al arreglo de "outOfStock"
      for (const element of cart.products) {
        if ( element.product.stock > element.quantity ) {
          purchaseAmount += element.quantity * element.product.price
          await this.productMongoManager.updateProduct(element.product._id, {
            stock: element.product.stock - element.quantity
          })
          await this.cartMongoManager.deleteProductFromCart(cid, element.product._id)
        } else {
          outOfStock.push(element.product.title)
        }
      }

      // Si ningun producto tenia stock
      if(outOfStock.length > 0 && purchaseAmount === 0) {
        console.log("🚀 ~ file: cartsMongo.router.js:406 ~ CartsMongoRoutes ~ this.router.post ~ outOfStock:", outOfStock)
        return httpResp.BadRequest(res,'Selected products are out of stock.',null);   
      }

      // Corroboro el id del usuario que es dueño de ese cart
      const userWithCart = await userModel.findOne({ cart: cid });
      console.log("🚀 ~ file: cartsMongo.router.js:415 ~ CartsMongoRoutes ~ this.router.post ~ userWithCart:", userWithCart)
      
      // Creo un ticket pasandole el email del usuario dueño del carrito, y el monto total de la compra.
      // (El id carrito se le asigna al usuario cuando el mismo se registra). Relacion 1 a 1 entre cart y usuario.
      const ticket = await ticketsManager.createTicket(userWithCart.email, purchaseAmount)

      // Si algunos productos no tenian stock
      if(outOfStock.length > 0 && purchaseAmount > 0) {
        return httpResp.OK(res,'Purchase submitted, The following products are out of stock:',{outOfStock, ticket});
      }
      // Si todos los productos tenian stock
      return httpResp.OK(res,'Purchase submitted, ticket:',ticket);
      // res.send(resp);          
      } catch (error) {
        console.log(error);
        //req.logger.error(error);
        // res.status(500).send({msg: error.message});
        httpResp.Error(res, 'Error while purchasing', error);
      }
    })
  }
}

export default CartsMongoRoutes;
