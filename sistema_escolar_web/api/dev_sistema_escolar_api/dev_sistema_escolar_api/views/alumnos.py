from django.db.models import *
from django.db import transaction
from django.shortcuts import get_object_or_404
from dev_sistema_escolar_api.serializers import UserSerializer
from dev_sistema_escolar_api.serializers import *
from dev_sistema_escolar_api.models import *
from rest_framework import permissions
from rest_framework import generics
from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth.models import Group
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters
from rest_framework.pagination import PageNumberPagination

class AlumnoPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
class AlumnosAll(generics.CreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = AlumnoSerializer
    pagination_class = AlumnoPagination
    
    def get_queryset(self):
        queryset = Alumnos.objects.filter(user__is_active=1).select_related('user')
        
        # Búsqueda
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(id__icontains=search) |
                Q(matricula__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(rfc__icontains=search) |
                Q(curp__icontains=search) |
                Q(fecha_nacimiento__icontains=search)
                
            )
        
        # Ordenamiento con mapeo
        ordering = self.request.query_params.get('ordering', 'matricula')
        
        field_mapping = {
            'nombre': 'user__first_name',
            '-nombre': '-user__first_name',
            'email': 'user__email',
            '-email': '-user__email',
            'id': 'id',
            '-id': '-id',
            'matricula': 'matricula',
            '-matricula': '-matricula',
            'rfc': 'rfc',
            '-rfc': '-rfc',
            'curp': 'curp',
            '-curp': '-curp',
            'fecha_nacimiento': 'fecha_nacimiento',
            '-fecha_nacimiento': '-fecha_nacimiento',
        }
        
        ordering_field = field_mapping.get(ordering, 'matricula')
        queryset = queryset.order_by(ordering_field)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            lista = serializer.data
            
            return self.get_paginated_response(lista)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)
    
class AlumnosView(generics.CreateAPIView):
    #obtener usuario por id
    permission_classes = (permissions.IsAuthenticated,)
    def get(self, request, *args, **kwargs):
        alumno = get_object_or_404(Alumnos, id = request.GET.get("id"))
        alumno = AlumnoSerializer(alumno, many=False).data
        return Response(alumno, 200)
    
    
    #Registrar nuevo usuario
    @transaction.atomic
    def post(self, request, *args, **kwargs):

        user = UserSerializer(data=request.data)
        if user.is_valid():
            #Grab user data
            role = request.data['rol']
            first_name = request.data['first_name']
            last_name = request.data['last_name']
            email = request.data['email']
            password = request.data['password']
            #Valida si existe el usuario o bien el email registrado
            existing_user = User.objects.filter(email=email).first()

            if existing_user:
                return Response({"message":"Username "+email+", is already taken"},400)

            user = User.objects.create( username = email,
                                        email = email,
                                        first_name = first_name,
                                        last_name = last_name,
                                        is_active = 1)


            user.save()
            user.set_password(password)
            user.save()

            group, created = Group.objects.get_or_create(name=role)
            group.user_set.add(user)
            user.save()

            #Create a profile for the user
            alumno = Alumnos.objects.create(user=user,
                                            matricula= request.data["matricula"],
                                            curp= request.data["curp"].upper(),
                                            rfc= request.data["rfc"].upper(),
                                            fecha_nacimiento= request.data["fecha_nacimiento"],
                                            edad= request.data["edad"],
                                            telefono= request.data["telefono"],
                                            ocupacion= request.data["ocupacion"])
            alumno.save()

            return Response({"Alumno creado con ID: ": alumno.id }, 201)

        return Response(user.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
    #TODO: Editar alumno