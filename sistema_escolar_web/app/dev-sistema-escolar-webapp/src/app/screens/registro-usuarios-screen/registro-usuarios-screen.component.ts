import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FacadeService } from 'src/app/services/facade.service';
import { MatRadioChange } from '@angular/material/radio';
import { AdministradoresService } from 'src/app/services/administradores.service';
import { MaestrosService } from 'src/app/services/maestros.service';
import { AlumnosService } from 'src/app/services/alumnos.service';

@Component({
  selector: 'app-registro-usuarios-screen',
  templateUrl: './registro-usuarios-screen.component.html',
  styleUrls: ['./registro-usuarios-screen.component.scss']
})
export class RegistroUsuariosScreenComponent implements OnInit {

  public tipo:string = "registro-usuarios";
  public user:any = {};
  public editar:boolean = false;
  public rol:string = "";
  public idUser:number = 0;

  //Banderas para el tipo de usuario
  public isAdmin:boolean = false;
  public isAlumno:boolean = false;
  public isMaestro:boolean = false;

  public tipo_user:string = "";

  constructor(
    private location : Location,
    public activatedRoute: ActivatedRoute,
    private router: Router,
    public facadeService: FacadeService,
    private administradoresService: AdministradoresService,
    private maestrosService: MaestrosService,
    private alumnosService: AlumnosService,
  ) { }

  ngOnInit(): void {
    this.user.tipo_user = '';
    //valida si hay un parametro en el url
    if(this.activatedRoute.snapshot.params['rol']!=undefined){
      this.rol = this.activatedRoute.snapshot.params['rol'];
      console.log("ROL: ", this.rol);
    }

    //valida si hay un parametro ID en el url
    if(this.activatedRoute.snapshot.params['id']!=undefined)
      {
        this.editar = true;
        this.idUser = this.activatedRoute.snapshot.params['id'];
        console.log("ID USUARIO: ", this.idUser);
        this.obtenerUserById();
      }

  }

  public obtenerUserById(){
    //obtener los datos del usuario segun su rol y id
    console.log("Obteniendo datos del usuario con ID: ", this.rol, this.idUser);
    if(this.rol == "administrador"){
      this.administradoresService.obtenerAdminPorID(this.idUser).subscribe(
        (response:any) => {
          console.log("Datos del admin: ", this.user);
          this.user = response;
          this.user.first_name = response.user?.first_name || response.first_name;
          this.user.last_name = response.user?.last_name || response.last_name;
          this.user.email = response.user?.email || response.email;
          this.user.tipo_usuario = this.rol;
          this.isAdmin = true;
        }, (error) => {

          console.log("Error : ", error);
          alert("No se pudieron obtener los datos del administrador");

        }

      );
    }else if(this.rol == "maestros"){
      this.maestrosService.obtenerMaestroPorID(this.idUser).subscribe(
        (response:any) => {
          console.log("Datos del maestro: ", this.user);
          this.user = response;
          this.user.first_name = response.user?.first_name || response.first_name;
          this.user.last_name = response.user?.last_name || response.last_name;
          this.user.email = response.user?.email || response.email;
          this.user.tipo_usuario = this.rol;
          // Parsear materias_json 
          if(typeof this.user.materias_json === 'string') {
            try {
              this.user.materias_json = JSON.parse(this.user.materias_json);
            } catch(e) {
              this.user.materias_json = [];
            }
          }
          this.isMaestro = true;
        }, (error) => {
          console.log("Error : ", error);
          alert("No se pudieron obtener los datos del maestro");
        }
      );
    }else if(this.rol == "alumnos"){
      this.alumnosService.obtenerAlumnoPorID(this.idUser).subscribe(
        (response:any) => {
          console.log("Datos del alumno: ", this.user);
          this.user = response;
          this.user.first_name = response.user?.first_name || response.first_name;
          this.user.last_name = response.user?.last_name || response.last_name;
          this.user.email = response.user?.email || response.email;
          this.user.tipo_usuario = this.rol;
          this.isAlumno = true;
        }, (error) => {
          console.log("Error : ", error);
          alert("No se pudieron obtener los datos del alumno");
        }
      );
    }

  }

  public radioChange(event: MatRadioChange) {
    if(event.value == "administrador"){
      this.isAdmin = true;
      this.isAlumno = false;
      this.isMaestro = false;
      this.tipo_user = "administrador";
    }else if (event.value == "alumno"){
      this.isAdmin = false;
      this.isAlumno = true;
      this.isMaestro = false;
      this.tipo_user = "alumno";
    }else if (event.value == "maestro"){
      this.isAdmin = false;
      this.isAlumno = false;
      this.isMaestro = true;
      this.tipo_user = "maestro";
    }
  }

  //Función para regresar a la pantalla anterior
  public goBack() {
    this.location.back();
  }
}
