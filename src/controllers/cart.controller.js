import TicketController from "./ticket.controller.js"; 
import { HttpResponse , EnumErrors } from "../middleware/error-handler.js";
import CartsMongoManager from '../dao/managers/cartMongo.manager.js'; 
import ProductMongoManager from '../dao/managers/productMongo.manager.js'
import cartsMongoModel from "../dao/models/cartsMongo.models.js";

class CartController {

  constructor() {
    //this.cartService = new CartService();
    this.ticketController = new TicketController();
    this.httpResp = new HttpResponse();
    this.enumError = EnumErrors;
    this.cartMongoManager = new CartsMongoManager();
    this.productMongoManager = new ProductMongoManager();

  }

  createCart = async (req, res) => {
    try {    
      const cartMongo = {"products": []};
      const newCartMongo = await this.cartMongoManager.createCartMongo(cartMongo);
      if (!newCartMongo) {
        return this.httpResp.Error(res,`the cartMongo not created`, {error:this.enumError.DATABASE_ERROR});       
      }
      return this.httpResp.OK(res,`Carrito nuevo creado`, {newCartMongo:newCartMongo}); 
    } catch (error) {
      req.logger.fatal(
        `Method: ${req.method}, url: ${
          req.url
        } - time: ${new Date().toLocaleTimeString()
        } con ERROR: ${error.message}`);   
     
      return this.httpResp.Error(res,`the cartMongo not created ${this.enumError.CONTROLLER_ERROR}`, {error:error}); 
      }
  };

  getCarts = async (req, res) => {
    //efren

  };

  getCartById = async (req, res) => {
    try {
      const cid=req.params.cid;
      let cartMongoData = await this.cartMongoManager.getCartMongoByIdPopulate(cid);//population        
      //REVISANDO SI EL CARRITO YA FUE CREADO ANTERIOMENTE        
      if (!cartMongoData) {
        return this.httpResp.Error(res,`the cart by Id in Mongo Atlas not found`, {error:this.enumError.INVALID_PARAMS}); 

      }
      return this.httpResp.OK(res,`cart found successfully in Mongo Atlas (with population)`, {cart: cartMongoData}); 

    } catch (error) {
      req.logger.fatal(
        `Method: ${req.method}, url: ${
          req.url
        } - time: ${new Date().toLocaleTimeString()
        } con ERROR: ${error.message}`);   

      return this.httpResp.Error(res,error.message ?? error, {error:this.enumError.CONTROLLER_ERROR});  
      }

  };

  updateCartById = async (req, res) => {
    //efren

  };

  deleteCart = async (req, res) => {
    //efren

  };

  deleteAllProductsInCart = async (req, res) => {
    //efren

  };

  createProductInCart = async (req, res) => {
    try {
      const cid=req.params.cid;
      const pid=req.params.pid;
      const { email, role } = req.user.user;
      const productMongoExist = await this.productMongoManager.getProductMongoById(
        pid
      );  
      //verificar si existe producto
      if (!productMongoExist) {
        return this.httpResp.BadRequest(res, `Unexisting Product error: ${this.enumError.INVALID_PARAMS}`, 'Product not found')
      }
      //comparar owner de producto con email de usuario, no proceder si son iguales
      if (productMongoExist.owner === email ) {
        return this.httpResp.Forbbiden(res, 'you are owner', 'You are not can buy this product')
      }

      let cartMongoData = {};

      cartMongoData = await this.cartMongoManager.getCartMongoById(cid);
      //verificar si existe carrito
      if (!cartMongoData) {// 1. si no existe carrito no se hace nada
        return this.httpResp.Error(res,`the cart by Id in Mongo Atlas not found`, {error:this.enumError.INVALID_PARAMS}); 
      }
        //2. si existe carrito pero no tiene productos se agrega el producto con quantity 1
      if(cartMongoData.products==[]){           
          const productNewId= new ObjectId(pid);
          req.logger.debug(
            `Method: ${req.method}, url: ${
              req.url
            } - time: ${new Date().toLocaleTimeString()
            } entro en 2`
          ); 
          cartsMongoModel.findByIdAndUpdate(cid, { products: [{product: productNewId, quantity: 1}] }, { new: true })
          .then(updatedCart => {
            req.logger.info(
              `Method: ${req.method}, url: ${
                req.url
              } - time: ${new Date().toLocaleTimeString()
              } updatedCart: ${updatedCart}`
            );  
            cartMongoData=updatedCart;
          })
          .catch(error => {
            req.logger.fatal(
              `Method: ${req.method}, url: ${
                req.url
              } - time: ${new Date().toLocaleTimeString()
              } con ERROR: ${error.message}`); 
            return this.httpResp.Error(res,`the cart by Id in Mongo Atlas not update`, {error:this.enumError.DATABASE_ERROR}); 
          });
      } else {// fin if 2, else al if 2... Situacion 3. si el carrito tiene productos verificar si ya tiene el producto
        req.logger.debug(
          `Method: ${req.method}, url: ${
            req.url
          } - time: ${new Date().toLocaleTimeString()
          } Comparando cada producto en carrito con pid pasado por parametro en url, antes de entrar a 3 o 4 `
        );  
          //console.log("verificando antes de entrar a caso 3 o 4")
          //const idComp = new ObjectId(pid);
          let existeProduct = false;
          let indexOfProducts= 0;
          cartMongoData.products.forEach((element,i) => {  
            req.logger.debug(
              `Method: ${req.method}, url: ${
                req.url
              } - time: ${new Date().toLocaleTimeString()
              } product: ${element.product.toString()} `
            );       
            req.logger.debug(
              `Method: ${req.method}, url: ${
                req.url
              } - time: ${new Date().toLocaleTimeString()
              } pid: ${pid} `
            );  

            if(element.product.toString() === pid){//este if solo funciono con toString() en ambos
              req.logger.debug(
                `Method: ${req.method}, url: ${
                  req.url
                } - time: ${new Date().toLocaleTimeString()
                } el producto ya lo tiene el carrito`
              ); 
              existeProduct= true;
              indexOfProducts=i;              
            }              
          }); 

          if(existeProduct){//if 3 situacion 3, si ya se tiene el producto incrementamos quantity
                cartMongoData.products[indexOfProducts].quantity++;
                req.logger.debug(
                  `Method: ${req.method}, url: ${
                    req.url
                  } - time: ${new Date().toLocaleTimeString()
                  }  entrooooo en caso 3, ya tiene el producto se incrementa quantity `
                );
                cartsMongoModel.findByIdAndUpdate(cid, {products: cartMongoData.products }, { new: true })
                .then(updatedCart => {
                  req.logger.http(
                    `Method: ${req.method}, url: ${
                      req.url
                    } - time: ${new Date().toLocaleTimeString()
                    }Carrito actualizado updatedCart: ${updatedCart}  `
                  );
                  cartMongoData = updatedCart;

                })
                .catch(error => {
                  req.logger.fatal(
                    `Method: ${req.method}, url: ${
                      req.url
                    } - time: ${new Date().toLocaleTimeString()
                    } con ERROR: ${error.message}`); 
                  return this.httpResp.Error(res,`the cart by Id in Mongo Atlas not update`, {error:this.enumError.DATABASE_ERROR}); 

                });
          } else {//else a if 3,  situacion 4 . si el carrrito existe y no tiene el producto hacer quantity =1
            req.logger.debug(
              `Method: ${req.method}, url: ${
                req.url
              } - time: ${new Date().toLocaleTimeString()
              } entro en caso 4, no tiene el producto, se agregara un nuevo ObjectId del producto en el carrito`
            );    
                const productNewId= new ObjectId(pid);
                cartMongoData.products.push({ product:productNewId, quantity: 1 }); 
                cartsMongoModel.findByIdAndUpdate(cid, {products: cartMongoData.products }, { new: true })
                .then(updatedCart => {
                  req.logger.info(
                    `Method: ${req.method}, url: ${
                      req.url
                    } - time: ${new Date().toLocaleTimeString()
                    } updateCart: ${updatedCart}`
                  );
                  cartMongoData = updatedCart;
                })
                .catch(error => {
                  req.logger.fatal(
                    `Method: ${req.method}, url: ${
                      req.url
                    } - time: ${new Date().toLocaleTimeString()
                    } con ERROR: ${error.message}`);  
                  return this.httpResp.Error(res,`c error ${this.enumError.DATABASE_ERROR}`, {error:error.message ?? error}); 
                });          
          }// fin else de situacion 4
      }//fin else del if 2, situacion 3
      return this.httpResp.OK(res,`cart found successfully and update in Mongo Atlas`,{cartMongoData});

    } catch (error) {
      req.logger.fatal(
        `Method: ${req.method}, url: ${
          req.url
        } - time: ${new Date().toLocaleTimeString()
        } con ERROR: ${error.message}`);   
       return this.httpResp.Error(res,`cart by Id in Mongo Atlas not update with product by Id, error: ${this.enumError.CONTROLLER_ERROR}`, {error:error.message ?? error});
      }
  };

  updateCartItemQuantity = async (req, res) => {
    //efren

  };

  deleteItemInCart = async (req, res) => {
    //efren

  };

  purchaseCart = async (req, res) => {
    //efren

  };
}

export default CartController;
